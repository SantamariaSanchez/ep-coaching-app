import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";

// Récap hebdo sommeil/récupération — déclenché une fois par semaine
// (dimanche soir) par Supabase pg_cron, voir
// supabase/migrations/20260807_weekly_sleep_recap_cron.sql. Ferme la
// boucle : la tendance de la semaine vient au client plutôt que d'exiger
// qu'il pense à ouvrir l'onglet Sommeil pour la voir.
function avg(vals: (number | null)[]): number | null {
  const v = vals.filter((x): x is number => x != null);
  return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

interface LogRow {
  client_id: string;
  log_date: string;
  sleep_hours: number | null;
  readiness_score: number | null;
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
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const { data: logs } = await admin
    .from("biometric_logs")
    .select("client_id, log_date, sleep_hours, readiness_score")
    .gte("log_date", twoWeeksAgo.toISOString().split("T")[0]);

  const byClient = new Map<string, LogRow[]>();
  for (const l of (logs ?? []) as LogRow[]) {
    const arr = byClient.get(l.client_id) ?? [];
    arr.push(l);
    byClient.set(l.client_id, arr);
  }

  const clientIds = [...byClient.keys()];
  const { data: profiles } = clientIds.length
    ? await admin.from("profiles").select("id, role").in("id", clientIds)
    : { data: [] as { id: string; role: string }[] };
  const roleById = new Map((profiles ?? []).map((p) => [p.id, p.role]));

  let notified = 0;
  for (const [clientId, entries] of byClient) {
    const thisWeek = entries.filter((e) => e.log_date >= weekAgoStr);
    const lastWeek = entries.filter((e) => e.log_date < weekAgoStr);
    // Pas assez de nuits loguées cette semaine pour qu'une moyenne ait un
    // sens — mieux vaut se taire qu'envoyer un chiffre bruité sur 1 nuit.
    if (thisWeek.length < 2) continue;

    const avgSleep = avg(thisWeek.map((e) => e.sleep_hours));
    if (avgSleep == null) continue;
    const avgReadiness = avg(thisWeek.map((e) => e.readiness_score));
    const avgSleepPrev = avg(lastWeek.map((e) => e.sleep_hours));

    const trend = avgSleepPrev != null ? avgSleep - avgSleepPrev : null;
    const trendText = trend == null ? "" : trend > 0.3 ? " (en hausse)" : trend < -0.3 ? " (en baisse)" : "";

    const body = avgReadiness != null
      ? `Sommeil moyen : ${avgSleep.toFixed(1)}h${trendText}. Récupération moyenne : ${Math.round(avgReadiness)}/100.`
      : `Sommeil moyen : ${avgSleep.toFixed(1)}h${trendText}.`;

    const url = roleById.get(clientId) === "coach" ? "/dashboard/coach/moi/tracking" : "/dashboard/client/tracking";

    await notifyUser(clientId, {
      type: "weekly_sleep_recap",
      title: "🌙 Ton récap sommeil de la semaine",
      body,
      url,
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified, checked: byClient.size });
}
