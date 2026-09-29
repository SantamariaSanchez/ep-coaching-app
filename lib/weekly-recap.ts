import { createServerSupabase } from "@/lib/supabase-server";
import type { WeeklyRecapStats } from "@/lib/weekly-recap-format";
import { todayInParis } from "@/lib/dates";
import { addDaysToDate, countDistinctSessions } from "@/lib/weekly-review-helpers";

export type { WeeklyRecapStats } from "@/lib/weekly-recap-format";
export { formatWeeklyRecapLine } from "@/lib/weekly-recap-format";

// Brainstorm "2 avatars" (2026-09-10) : le récap hebdo (séances/nutrition/
// poids) n'existait QUE comme notification push (app/api/cron/
// weekly-progress-recap/route.ts) — facile à manquer ou désactiver, et
// invisible pour qui ne l'a jamais vue passer. Ce module extrait le même
// calcul pour un usage direct en page (Aujourd'hui), avec des requêtes
// ciblées sur un seul client plutôt que le batch "tous les clients" du
// cron (adapté à son contexte : une exécution par semaine sur toute la
// base, pas un aller-retour par page vue).
//
// La formulation (formatWeeklyRecapLine) vit dans lib/weekly-recap-format.ts,
// un module sans aucun import — importable tel quel depuis AujourdhuiView.tsx
// ("use client") sans entraîner createServerSupabase (ci-dessus) dans le
// bundle navigateur. Ce fichier-ci (le calcul, avec sa dépendance serveur)
// n'est lui importé que côté serveur (app/dashboard/client/aujourdhui/page.tsx,
// un Server Component).

function avg(vals: (number | null)[]): number | null {
  const v = vals.filter((x): x is number => x != null);
  return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export async function getMyWeeklyRecap(clientId: string): Promise<WeeklyRecapStats | null> {
  try {
    const supabase = await createServerSupabase();
    // Fenêtre de 7 jours glissants AUJOURD'HUI INCLUS, en dates de Paris
    // (audit 2026-09-29) : l'ancien calcul partait de new Date() en UTC, et
    // regroupait les repas par created_at.slice(0, 10), donc en date UTC.
    // Un repas noté entre 0h et 2h (heure de Paris) tombait sur la veille.
    // food_logs.logged_at et workout_logs.logged_at sont des colonnes date
    // déjà écrites en heure de Paris : on les utilise directement.
    const today = todayInParis();
    const weekAgoDateStr = addDaysToDate(today, -6);
    const twoWeeksAgoDateStr = addDaysToDate(today, -13);

    const [sessionsRes, workoutsRes, foodRes, dailyRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, session_date")
        .eq("client_id", clientId)
        .eq("is_completed", true)
        .gte("session_date", weekAgoDateStr)
        .lte("session_date", today),
      supabase
        .from("workout_logs")
        .select("session_id, logged_at")
        .eq("client_id", clientId)
        .gte("logged_at", weekAgoDateStr)
        .lte("logged_at", today),
      supabase.from("food_logs").select("logged_at").eq("client_id", clientId).gte("logged_at", weekAgoDateStr).lte("logged_at", today),
      supabase.from("daily_logs").select("log_date, weight_morning").eq("client_id", clientId).gte("log_date", twoWeeksAgoDateStr),
    ]);
    const firstError = sessionsRes.error ?? workoutsRes.error ?? foodRes.error ?? dailyRes.error;
    if (firstError) throw firstError;

    // Une séance = une séance, pas une ligne par exercice (voir
    // countDistinctSessions : c'est ce qui donnait "32 séances").
    const sessions = countDistinctSessions(
      (sessionsRes.data ?? []) as { id: string; session_date: string | null }[],
      (workoutsRes.data ?? []) as { session_id: string | null; logged_at: string | null }[],
    );

    const foodDaysSet = new Set(((foodRes.data ?? []) as { logged_at: string }[]).map((f) => f.logged_at.slice(0, 10)));

    const weights = (dailyRes.data ?? []) as { log_date: string; weight_morning: number | null }[];
    const thisWeekWeights = weights.filter((w) => w.log_date >= weekAgoDateStr).map((w) => w.weight_morning);
    const lastWeekWeights = weights.filter((w) => w.log_date < weekAgoDateStr).map((w) => w.weight_morning);
    const avgWeight = avg(thisWeekWeights);
    const avgWeightPrev = avg(lastWeekWeights);
    const weightDeltaKg = avgWeight != null && avgWeightPrev != null ? Math.round((avgWeight - avgWeightPrev) * 10) / 10 : null;

    return { sessions, foodDays: foodDaysSet.size, weightDeltaKg, avgWeight };
  } catch (e) {
    console.error("getMyWeeklyRecap error:", e);
    return null;
  }
}
