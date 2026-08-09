import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";

// Relance en douceur si une séance était prévue dans l'agenda aujourd'hui
// (bloc icon="salle", voir lib/agenda-presets.ts) et qu'elle n'a jamais été
// loggée dans le logbook — avant, rien ne reliait "séance planifiée" et
// "séance réellement faite". Tourne une fois par soir (voir la migration
// pg_cron associée), assez tard pour laisser le temps de s'entraîner, sans
// attendre le lendemain matin où le rappel n'aurait plus aucun sens.

interface ScheduleBlockRow {
  owner_id: string;
  label: string;
  end_time: string;
}

function parisDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(date);
}

function parisIsoWeekday(date: Date): number {
  const w = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short" }).format(date);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[w] ?? 1;
}

function parisTimeStr(date: Date): string {
  return (
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date) + ":00"
  );
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = parisDateStr(now);
  const todayDow = parisIsoWeekday(now);
  const nowTime = parisTimeStr(now);

  const supabase = createAdminClient();

  const { data: blocks } = await supabase
    .from("schedule_blocks")
    .select("owner_id, label, end_time")
    .eq("day_of_week", todayDow)
    .eq("icon", "salle")
    .lte("end_time", nowTime);

  const planned = (blocks as ScheduleBlockRow[] | null) ?? [];
  // Un seul rappel par personne même si plusieurs blocs "salle" le même jour.
  const byOwner = new Map<string, ScheduleBlockRow>();
  for (const b of planned) if (!byOwner.has(b.owner_id)) byOwner.set(b.owner_id, b);

  let sent = 0;
  for (const [ownerId, block] of byOwner) {
    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("client_id", ownerId)
      .eq("session_date", today)
      .eq("is_completed", true);

    if ((count ?? 0) > 0) continue; // déjà loggée, rien à faire

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", ownerId).maybeSingle();
    const url = (profile as { role: string } | null)?.role === "coach" ? "/dashboard/coach/moi/logbook" : "/dashboard/client/logbook";

    await notifyUser(ownerId, {
      type: "missed_session_reminder",
      title: "🏋️ Séance pas encore loggée",
      body: `Tu avais « ${block.label} » de prévu aujourd'hui, pense à la valider dans ton logbook si tu l'as faite.`,
      url,
    });
    sent++;
  }

  return NextResponse.json({ ok: true, checked: byOwner.size, sent });
}
