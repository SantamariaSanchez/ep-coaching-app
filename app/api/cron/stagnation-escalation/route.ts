import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { getWeekStart } from "@/utils/checkins";

// Lutte active contre la stagnation : contrairement aux rappels existants
// (nutrition-reminder, missed-session-check, nag-tasks...) qui relancent le
// jour même sur un oubli ponctuel, celui-ci regarde l'accumulation sur
// plusieurs jours et, si ça ne bouge toujours pas, propose un appel avec le
// coach au lieu de continuer à notifier dans le vide — ET prévient le coach
// pour qu'il aille vers le client plutôt que d'attendre que ce dernier se
// manifeste. Tourne une fois par jour, mais chaque client n'est escaladé
// qu'une fois par semaine maximum (last_stagnation_escalation_at).
//
// Un appel se réserve déjà en libre-service dans les disponibilités du
// coach (bookAvailabilitySlot, app/dashboard/client/live/actions.ts) et
// crée directement le live_event : l'agenda du coach se met donc à jour
// tout seul dès que le client réserve, sans action de sa part — c'est
// exactement ce qu'on veut, pas besoin de réinventer un mécanisme séparé.

const LOGBOOK_STALE_DAYS = 7;
const NUTRITION_STALE_DAYS = 3;
const TASK_STALE_DAYS = 7;
const CHECKIN_GRACE_DAYS = 2; // laisse 2 jours après le jour de check-in avant de considérer que c'est raté
const ESCALATION_COOLDOWN_DAYS = 7;

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function isoWeekday(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

interface ClientRow {
  id: string;
  full_name: string | null;
  coach_id: string | null;
  checkin_day: number | null;
  last_stagnation_escalation_at: string | null;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const cooldownCutoff = daysAgo(ESCALATION_COOLDOWN_DAYS);

  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, coach_id, checkin_day, last_stagnation_escalation_at")
    .eq("role", "client")
    .not("onboarding_completed_at", "is", null)
    .or(`last_stagnation_escalation_at.is.null,last_stagnation_escalation_at.lt.${cooldownCutoff}`);

  let escalated = 0;
  const checked = (clients as ClientRow[] | null) ?? [];

  for (const client of checked) {
    const reasons: string[] = [];

    const { count: recentSessions } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client.id)
      .eq("is_completed", true)
      .gte("session_date", daysAgo(LOGBOOK_STALE_DAYS).split("T")[0]);
    if ((recentSessions ?? 0) === 0) reasons.push("logbook");

    const { count: recentFoodLogs } = await supabase
      .from("food_logs")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client.id)
      .gte("logged_at", daysAgo(NUTRITION_STALE_DAYS).split("T")[0]);
    if ((recentFoodLogs ?? 0) === 0) reasons.push("nutrition");

    const { count: staleTasks } = await supabase
      .from("client_tasks")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client.id)
      .eq("status", "pending")
      .lt("created_at", daysAgo(TASK_STALE_DAYS));
    if ((staleTasks ?? 0) > 0) reasons.push("tasks");

    if (client.checkin_day) {
      const daysSinceCheckinDay = (isoWeekday(now) - client.checkin_day + 7) % 7;
      if (daysSinceCheckinDay >= CHECKIN_GRACE_DAYS) {
        const { count: thisWeekCheckin } = await supabase
          .from("check_ins")
          .select("id", { count: "exact", head: true })
          .eq("client_id", client.id)
          .eq("week_start", getWeekStart());
        if ((thisWeekCheckin ?? 0) === 0) reasons.push("checkin");
      }
    }

    if (reasons.length === 0) continue;

    const REASON_LABELS: Record<string, string> = {
      logbook: "le logbook d'entraînement",
      nutrition: "le suivi nutrition",
      tasks: "une tâche en attente depuis un moment",
      checkin: "le check-in de la semaine",
    };
    const reasonText = reasons.map((r) => REASON_LABELS[r]).join(", ");

    await notifyUser(client.id, {
      type: "stagnation_escalation",
      title: "On fait le point ?",
      body: `${reasonText.charAt(0).toUpperCase() + reasonText.slice(1)} n'a pas bougé depuis un moment. Réserve un appel avec ton coach pour ajuster ce qui coince.`,
      url: "/dashboard/client/live/reserver",
    });

    if (client.coach_id) {
      await notifyUser(client.coach_id, {
        type: "stagnation_escalation_coach",
        title: `⚠️ ${client.full_name ?? "Un client"} décroche`,
        body: `Signal(aux) : ${reasonText}. Une relance directe a été envoyée, mais un contact de ta part vaut mieux qu'une notif de plus.`,
        url: `/dashboard/coach/clients/${client.id}`,
      });
    }

    await supabase
      .from("profiles")
      .update({ last_stagnation_escalation_at: now.toISOString() })
      .eq("id", client.id);

    escalated++;
  }

  return NextResponse.json({ ok: true, checked: checked.length, escalated });
}
