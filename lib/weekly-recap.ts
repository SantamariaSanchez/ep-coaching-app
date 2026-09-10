import { createServerSupabase } from "@/lib/supabase-server";
import type { WeeklyRecapStats } from "@/lib/weekly-recap-format";

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
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);
    const weekAgoIso = weekAgo.toISOString();
    const weekAgoDateStr = weekAgo.toISOString().split("T")[0];
    const twoWeeksAgoDateStr = twoWeeksAgo.toISOString().split("T")[0];

    const [{ data: workouts }, { data: foodLogs }, { data: dailyLogs }] = await Promise.all([
      supabase.from("workout_logs").select("created_at").eq("client_id", clientId).gte("created_at", weekAgoIso),
      supabase.from("food_logs").select("created_at").eq("client_id", clientId).gte("created_at", weekAgoIso),
      supabase.from("daily_logs").select("log_date, weight_morning").eq("client_id", clientId).gte("log_date", twoWeeksAgoDateStr),
    ]);

    const sessions = (workouts ?? []).length;

    const foodDaysSet = new Set(((foodLogs ?? []) as { created_at: string }[]).map((f) => f.created_at.slice(0, 10)));

    const weights = (dailyLogs ?? []) as { log_date: string; weight_morning: number | null }[];
    const thisWeekWeights = weights.filter((w) => w.log_date >= weekAgoDateStr).map((w) => w.weight_morning);
    const lastWeekWeights = weights.filter((w) => w.log_date < weekAgoDateStr).map((w) => w.weight_morning);
    const avgWeight = avg(thisWeekWeights);
    const avgWeightPrev = avg(lastWeekWeights);
    const weightDeltaKg = avgWeight != null && avgWeightPrev != null ? Math.round((avgWeight - avgWeightPrev) * 10) / 10 : null;

    return { sessions, foodDays: foodDaysSet.size, weightDeltaKg, avgWeight };
  } catch {
    return null;
  }
}
