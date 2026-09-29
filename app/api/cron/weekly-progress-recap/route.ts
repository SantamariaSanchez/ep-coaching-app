import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { formatWeeklyRecapLine } from "@/lib/weekly-recap-format";
import { nowInParis, addMinutesToHhmm, todayInParis } from "@/lib/dates";
import { addDaysToDate, countDistinctSessions } from "@/lib/weekly-review-helpers";

// Item 23 (récap hebdo personnalisé) : cible chaque dimanche 18h00
// (Europe/Paris). Ferme la boucle sur séances + nutrition + poids en un
// seul message plutôt que trois notifications séparées dans la même
// soirée.
// Ancien fonctionnement : cron pg_cron déclenché une seule fois par
// semaine à un décalage UTC fixe ('0 18 * * 0'), qui ne tombait sur 18h
// Paris qu'en heure d'hiver (UTC+1) — en heure d'été (UTC+2) ça sonnait à
// 20h Paris, pg_cron ne suivant aucun fuseau horaire et ne s'ajustant
// jamais seul au changement d'heure. Correctif structurel (voir migration
// 20260916_fix_dst_drift_notification_crons.sql) : le cron tourne
// désormais toutes les heures, uniquement le dimanche (UTC — sans risque
// de décalage de jour vu que la fenêtre cible tombe en soirée, loin de
// minuit), et c'est cette route qui décide dynamiquement si on est dans
// le bon créneau, en heure de Paris réelle (Intl, gère automatiquement
// l'heure d'été/hiver).
//
// La formulation du message (formatWeeklyRecapLine) vit maintenant dans
// lib/weekly-recap.ts, partagée avec l'affichage direct en page (Aujourd'hui,
// brainstorm "2 avatars" 2026-09-10) — un seul texte, que le membre le voie
// en push ou en page. Le calcul en masse ci-dessous (tous les clients en 3
// requêtes groupées) reste ici tel quel : le réécrire client par client
// via lib/weekly-recap.ts transformerait 3 requêtes en 3×N, inadapté à un
// cron qui traite toute la base d'un coup.
const TARGET_DOW = 7; // dimanche, convention isoDow de nowInParis (1=lundi...7=dimanche)
const TARGET_HHMM = "18:00";
const WINDOW_MINUTES = 60;

function avg(vals: (number | null)[]): number | null {
  const v = vals.filter((x): x is number => x != null);
  return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : null;
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
  // Bornes en dates de Paris (audit 2026-09-29) : 7 jours AUJOURD'HUI
  // INCLUS, donc du lundi au dimanche puisque ce cron tourne le dimanche.
  // L'ancien calcul (new Date() - 7 jours, en UTC) débordait sur le
  // dimanche précédent et regroupait les repas par date UTC.
  const today = todayInParis();
  const weekAgoDateStr = addDaysToDate(today, -6);
  const twoWeeksAgoDateStr = addDaysToDate(today, -13);

  const [sessionsRes, workoutsRes, foodRes, dailyRes, profilesRes] = await Promise.all([
    admin.from("sessions").select("id, client_id, session_date").eq("is_completed", true).gte("session_date", weekAgoDateStr).lte("session_date", today),
    admin.from("workout_logs").select("client_id, session_id, logged_at").gte("logged_at", weekAgoDateStr).lte("logged_at", today),
    admin.from("food_logs").select("client_id, logged_at").gte("logged_at", weekAgoDateStr).lte("logged_at", today),
    admin.from("daily_logs").select("client_id, log_date, weight_morning").gte("log_date", twoWeeksAgoDateStr),
    admin.from("profiles").select("id, role, subscription_status"),
  ]);
  // Un récap faux est pire que pas de récap : si une requête échoue, on
  // n'envoie rien plutôt qu'un "0 séance" à toute la base.
  const firstError = sessionsRes.error ?? workoutsRes.error ?? foodRes.error ?? dailyRes.error ?? profilesRes.error;
  if (firstError) {
    console.error("weekly-progress-recap query error:", firstError);
    return NextResponse.json({ error: "Lecture des données impossible" }, { status: 500 });
  }
  const profiles = profilesRes.data;

  // Brainstorm "2 avatars" (2026-09-10) : ce filtre excluait les membres
  // gratuits alors que tout ce dont ce récap a besoin (séances, nutrition,
  // poids) est déjà loggé par eux comme par les clients coachés — seul le
  // bilan revu PAR le coach leur est fermé, pas leurs propres logs. Un
  // membre gratuit régulier n'avait donc jusqu'ici aucun retour automatique
  // sur sa propre semaine. Ouvert à tout profil client (gratuit ou coaché) ;
  // seuls les coachs restent filtrés explicitement par rôle, comme avant.
  const eligibleIds = new Set(
    ((profiles ?? []) as { id: string; role: string; subscription_status: string | null }[])
      .map((p) => p.id)
  );

  // Séances : workout_logs contient UNE LIGNE PAR EXERCICE, les compter
  // une par une annonçait "32 séances" pour 2 ou 3 réelles. On regroupe par
  // client puis on compte les séances distinctes (countDistinctSessions,
  // même règle que la carte "Ta semaine" et la page Ma semaine).
  const completedByClient = new Map<string, { id: string; session_date: string | null }[]>();
  for (const s of (sessionsRes.data ?? []) as { id: string; client_id: string; session_date: string | null }[]) {
    const arr = completedByClient.get(s.client_id) ?? [];
    arr.push(s);
    completedByClient.set(s.client_id, arr);
  }
  const logsByClient = new Map<string, { session_id: string | null; logged_at: string | null }[]>();
  for (const w of (workoutsRes.data ?? []) as { client_id: string; session_id: string | null; logged_at: string | null }[]) {
    const arr = logsByClient.get(w.client_id) ?? [];
    arr.push(w);
    logsByClient.set(w.client_id, arr);
  }
  const sessionsThisWeek = new Map<string, number>();
  for (const clientId of new Set([...completedByClient.keys(), ...logsByClient.keys()])) {
    const n = countDistinctSessions(completedByClient.get(clientId) ?? [], logsByClient.get(clientId) ?? []);
    if (n > 0) sessionsThisWeek.set(clientId, n);
  }

  const foodDaysByClient = new Map<string, Set<string>>();
  for (const f of (foodRes.data ?? []) as { client_id: string; logged_at: string }[]) {
    const set = foodDaysByClient.get(f.client_id) ?? new Set<string>();
    set.add(f.logged_at.slice(0, 10));
    foodDaysByClient.set(f.client_id, set);
  }

  const weightsByClient = new Map<string, { log_date: string; weight_morning: number | null }[]>();
  for (const d of (dailyRes.data ?? []) as { client_id: string; log_date: string; weight_morning: number | null }[]) {
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

    const body = formatWeeklyRecapLine({
      sessions,
      foodDays,
      weightDeltaKg: weightDelta != null ? Math.round(weightDelta * 10) / 10 : null,
      avgWeight,
    });

    const isCoachSelf = (profiles as { id: string; role: string }[] | null)?.find((p) => p.id === clientId)?.role === "coach";
    // Le push mène à la revue complète de la semaine (séances, sommeil,
    // poids, questions de recul) plutôt qu'au simple bilan du jour.
    const url = isCoachSelf ? "/dashboard/coach/moi/semaine" : "/dashboard/client/semaine";

    await notifyUser(clientId, {
      type: "weekly_progress_recap",
      title: "📊 Ta semaine en un coup d'œil",
      body,
      url,
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified, checked: allClientIds.size });
}
