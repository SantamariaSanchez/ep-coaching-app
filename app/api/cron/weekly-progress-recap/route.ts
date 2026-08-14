import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";

// Item 23 (récap hebdo personnalisé) : déclenché chaque dimanche soir par
// Supabase pg_cron (enregistré directement en base, même mécanisme que
// weekly-sleep-recap — voir PROGRESS.md pour la note sur cette
// enregistrement direct plutôt qu'une migration commitée). Ferme la boucle
// sur séances + nutrition + poids en un seul message plutôt que trois
// notifications séparées dans la même soirée.
function avg(vals: (number | null)[]): number | null {
  const v = vals.filter((x): x is number => x != null);
  return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);
  const weekAgoIso = weekAgo.toISOString();
  const weekAgoDateStr = weekAgo.toISOString().split("T")[0];
  const twoWeeksAgoIso = twoWeeksAgo.toISOString();
  const twoWeeksAgoDateStr = twoWeeksAgo.toISOString().split("T")[0];

  const [{ data: workouts }, { data: foodLogs }, { data: dailyLogs }, { data: profiles }] = await Promise.all([
    admin.from("workout_logs").select("client_id, created_at").gte("created_at", weekAgoIso),
    admin.from("food_logs").select("client_id, created_at").gte("created_at", twoWeeksAgoIso),
    admin.from("daily_logs").select("client_id, log_date, weight_morning").gte("log_date", twoWeeksAgoDateStr),
    admin.from("profiles").select("id, role, subscription_status"),
  ]);

  const eligibleIds = new Set(
    ((profiles ?? []) as { id: string; role: string; subscription_status: string | null }[])
      .filter((p) => p.role === "coach" || p.subscription_status === "active")
      .map((p) => p.id)
  );

  const sessionsThisWeek = new Map<string, number>();
  for (const w of (workouts ?? []) as { client_id: string; created_at: string }[]) {
    sessionsThisWeek.set(w.client_id, (sessionsThisWeek.get(w.client_id) ?? 0) + 1);
  }

  const foodDaysByClient = new Map<string, Set<string>>();
  for (const f of (foodLogs ?? []) as { client_id: string; created_at: string }[]) {
    if (f.created_at < weekAgoIso) continue; // seulement cette semaine pour l'adhérence
    const day = f.created_at.slice(0, 10);
    const set = foodDaysByClient.get(f.client_id) ?? new Set<string>();
    set.add(day);
    foodDaysByClient.set(f.client_id, set);
  }

  const weightsByClient = new Map<string, { log_date: string; weight_morning: number | null }[]>();
  for (const d of (dailyLogs ?? []) as { client_id: string; log_date: string; weight_morning: number | null }[]) {
    const arr = weightsByClient.get(d.client_id) ?? [];
    arr.push(d);
    weightsByClient.set(d.client_id, arr);
  }

  // Un client actif quelque part cette semaine (séance, nutrition ou pesée) —
  // silence total ne mérite pas de notification, ça reviendrait à relancer
  // un client déjà silencieux sans rien de concret à lui montrer.
  const allClientIds = new Set([
    ...sessionsThisWeek.keys(),
    ...foodDaysByClient.keys(),
    ...[...weightsByClient.entries()].filter(([, arr]) => arr.some((e) => e.log_date >= weekAgoDateStr)).map(([id]) => id),
  ]);

  let notified = 0;
  for (const clientId of allClientIds) {
    if (!eligibleIds.has(clientId)) continue;

    const sessions = sessionsThisWeek.get(clientId) ?? 0;
    const foodDays = foodDaysByClient.get(clientId)?.size ?? 0;
    const weights = weightsByClient.get(clientId) ?? [];
    const thisWeekWeights = weights.filter((w) => w.log_date >= weekAgoDateStr).map((w) => w.weight_morning);
    const lastWeekWeights = weights.filter((w) => w.log_date < weekAgoDateStr).map((w) => w.weight_morning);
    const avgWeight = avg(thisWeekWeights);
    const avgWeightPrev = avg(lastWeekWeights);
    const weightDelta = avgWeight != null && avgWeightPrev != null ? avgWeight - avgWeightPrev : null;

    const parts: string[] = [`${sessions} séance${sessions !== 1 ? "s" : ""}`];
    parts.push(`nutrition loguée ${foodDays}/7 jours`);
    if (weightDelta != null && Math.abs(weightDelta) >= 0.1) {
      parts.push(`poids ${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)}kg sur la semaine`);
    } else if (avgWeight != null) {
      parts.push("poids stable");
    }

    const isCoachSelf = (profiles as { id: string; role: string }[] | null)?.find((p) => p.id === clientId)?.role === "coach";
    const url = isCoachSelf ? "/dashboard/coach/moi/bilan" : "/dashboard/client/bilan";

    await notifyUser(clientId, {
      type: "weekly_progress_recap",
      title: "📊 Ta semaine en un coup d'œil",
      body: parts.join(", ") + ".",
      url,
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified, checked: allClientIds.size });
}
