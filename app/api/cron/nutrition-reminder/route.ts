import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { todayInParis, nowInParis, addMinutesToHhmm } from "@/lib/dates";

// Cible 20h00 (Europe/Paris). Ancien fonctionnement : cron pg_cron déclenché
// une seule fois par jour à un décalage UTC fixe ('0 19 * * *', "19h UTC =
// 20h Paris"), qui n'était vrai qu'en heure d'été (UTC+2) — en heure d'hiver
// (UTC+1) ça sonnait à 19h Paris, et même en été le calcul d'origine était
// déjà faux (19h UTC + 2h = 21h, pas 20h). Comme pg_cron ne suit aucun fuseau
// horaire et ne s'ajuste jamais seul au changement d'heure, ce décalage
// figé redérivait de faux à chaque passage été/hiver.
// Correctif structurel (voir migration 20260916_fix_dst_drift_notification_crons.sql) :
// le cron tourne désormais toutes les 15 min, toute la journée (même
// principe que app/api/cron/meal-reminders), et c'est cette route qui
// décide dynamiquement si on est dans le bon créneau, en heure de Paris
// réelle (Intl, gère automatiquement l'heure d'été/hiver) plutôt qu'un
// calcul UTC figé.
const TARGET_HHMM = "20:00";
const WINDOW_MINUTES = 15;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hhmm } = nowInParis();
  const windowEnd = addMinutesToHhmm(TARGET_HHMM, WINDOW_MINUTES);
  if (hhmm < TARGET_HHMM || hhmm >= windowEnd) {
    return NextResponse.json({ ok: true, skipped: true, reason: "hors créneau", hhmm });
  }

  const supabase = createAdminClient();
  const today = todayInParis();

  // Clients avec un objectif calorique défini
  const { data: profiles } = await supabase
    .from("nutrition_profiles")
    .select("client_id, calories_target")
    .gt("calories_target", 0);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // Calories loggées aujourd'hui par client
  const clientIds = profiles.map((p) => p.client_id);
  const { data: logs } = await supabase
    .from("food_logs")
    .select("client_id, calories")
    .in("client_id", clientIds)
    .eq("logged_at", today);

  const calsByClient: Record<string, number> = {};
  for (const log of logs ?? []) {
    calsByClient[log.client_id] = (calsByClient[log.client_id] ?? 0) + (log.calories ?? 0);
  }

  let notified = 0;
  for (const profile of profiles) {
    const logged = calsByClient[profile.client_id] ?? 0;
    const target = profile.calories_target ?? 2000;

    // Envoie seulement si < 30% de l'objectif logué (= journée non trackée)
    if (logged / target < 0.30) {
      await sendPushToUser(
        profile.client_id,
        "⚡ Bilan nutrition du jour",
        "Trop la flemme de logger ? Choisis juste tes repas habituels, l'appli calcule tout.",
        "/dashboard/client/nutrition/bilan-rapide"
      ).catch(() => {});
      notified++;
    }
  }

  return NextResponse.json({ ok: true, notified, checked: profiles.length });
}
