import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { nowInParis, addMinutesToHhmm } from "@/lib/dates";

// Récap hebdo sommeil/récupération — cible chaque dimanche 19h00
// (Europe/Paris). Ferme la boucle : la tendance de la semaine vient au
// client plutôt que d'exiger qu'il pense à ouvrir l'onglet Sommeil pour la
// voir.
// Le job pg_cron (jobid 22, schedule '0 19 * * 0') a toujours été
// enregistré directement en base sans jamais passer par une migration
// commitée (voir MASTERCLASS.md, Axe AU, sur le bug du double envoi
// vercel.json + pg_cron déjà actif qui a révélé son existence) — cette
// lacune est comblée par la migration
// 20260916_fix_dst_drift_notification_crons.sql, qui est donc aussi la
// première trace commitée de ce cron.
// Ancien fonctionnement : décalage UTC fixe ('0 19 * * 0'), qui ne
// tombait sur 19h Paris qu'en heure d'hiver (UTC+1) — en heure d'été
// (UTC+2) ça sonnait à 21h Paris, pg_cron ne suivant aucun fuseau horaire
// et ne s'ajustant jamais seul au changement d'heure. Correctif structurel :
// le cron tourne désormais toutes les heures, uniquement le dimanche (UTC
// — sans risque de décalage de jour vu que la fenêtre cible tombe en
// soirée, loin de minuit), et c'est cette route qui décide dynamiquement
// si on est dans le bon créneau, en heure de Paris réelle (Intl, gère
// automatiquement l'heure d'été/hiver).
const TARGET_DOW = 7; // dimanche, convention isoDow de nowInParis (1=lundi...7=dimanche)
const TARGET_HHMM = "19:00";
const WINDOW_MINUTES = 60;

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

  const { isoDow, hhmm } = nowInParis();
  const windowEnd = addMinutesToHhmm(TARGET_HHMM, WINDOW_MINUTES);
  if (isoDow !== TARGET_DOW || hhmm < TARGET_HHMM || hhmm >= windowEnd) {
    return NextResponse.json({ ok: true, skipped: true, reason: "hors créneau", isoDow, hhmm });
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
