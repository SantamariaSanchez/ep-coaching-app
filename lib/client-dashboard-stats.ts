import { getTodayLogs, getLast7DaysLogs, getNutritionProfile } from "@/utils/nutrition";
import { getThisWeekCheckin, getISOWeek } from "@/utils/checkins";
import { createServerSupabase } from "@/lib/supabase-server";
import { todayInParis, nowInParis } from "@/lib/dates";
import { isSlotStarted } from "@/lib/nutrition-engine";
import type { Db } from "@/lib/db-types";

// Chiffres du jour de l'accueil client (anneaux + actions du jour), extraits
// de app/api/client/dashboard-stats pour servir aussi à l'aperçu
// « Voir comme mon client », qui les calcule côté serveur pour le client
// regardé au lieu de les demander pour la personne connectée.

export interface ClientDashboardStatsData {
  consumedCals: number;
  targetCals: number;
  adherence: number;
  daysWithLogs: number;
  stepsDisplay: string;
  sleepDisplay: string;
  hasCheckinThisWeek: boolean;
  weekNumber: number;
  hasSessionToday: boolean;
  hasBilanToday: boolean;
  weighInToday: boolean;
  todayStr: string;
}

export async function computeClientDashboardStats(userId: string, db?: Db): Promise<ClientDashboardStatsData> {
  const today = new Date();
  // Date de Paris (avant : date UTC, fausse entre minuit et 2 h).
  const todayStr = todayInParis();

  const supabase = db ?? (await createServerSupabase());

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const [nutritionProfile, todayLogs, last7DaysLogs, thisWeekCheckin, sessionCount, bilanCount, weighInCount, recentSleep] =
    await Promise.all([
      getNutritionProfile(userId, supabase),
      getTodayLogs(userId, undefined, supabase),
      getLast7DaysLogs(userId, supabase),
      getThisWeekCheckin(userId, supabase),
      // Did the user log a workout today?
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("client_id", userId)
        .eq("session_date", todayStr)
        .eq("is_completed", true),
      // Did the user fill their daily bilan today?
      supabase
        .from("daily_logs")
        .select("id", { count: "exact", head: true })
        .eq("client_id", userId)
        .eq("log_date", todayStr),
      // Le poids du matin est un champ du bilan quotidien mais mérite son
      // propre non-négociable — un bilan peut être rempli sans poids renseigné,
      // et "se peser le matin" est le premier réflexe qu'on veut jamais rater.
      supabase
        .from("daily_logs")
        .select("id", { count: "exact", head: true })
        .eq("client_id", userId)
        .eq("log_date", todayStr)
        .not("weight_morning", "is", null),
      // Sommeil des 7 derniers bilans quotidiens : le check-in hebdo est
      // réservé aux clients accompagnés, un membre gratuit n'avait donc
      // jamais de sommeil affiché alors qu'il le note chaque jour au bilan.
      supabase
        .from("daily_logs")
        .select("sleep_hours")
        .eq("client_id", userId)
        .gte("log_date", sevenDaysAgoStr)
        .not("sleep_hours", "is", null),
    ]);

  // Seulement les repas déjà commencés : la journée pré-remplie avec le
  // plan ne compte pas comme mangée d'avance.
  const { hhmm } = nowInParis();
  const consumedCals = Math.round(
    todayLogs.filter((l) => isSlotStarted(l.meal_slot ?? "breakfast", hhmm)).reduce((s, l) => s + (l.calories ?? 0), 0)
  );
  const targetCals = nutritionProfile?.calories_target ?? 0;

  const logDates = new Set(last7DaysLogs.map((l) => l.logged_at.split("T")[0]));
  const daysWithLogs = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d.toISOString().split("T")[0];
  }).filter((d) => logDates.has(d)).length;
  const adherence = Math.round((daysWithLogs / 7) * 100);

  const stepsDisplay = thisWeekCheckin?.steps_per_day
    ? thisWeekCheckin.steps_per_day.toLocaleString("fr-FR")
    : "-";
  const dailySleep = ((recentSleep.data ?? []) as { sleep_hours: number | null }[])
    .map((r) => Number(r.sleep_hours))
    .filter((h) => h > 0);
  const avgDailySleep = dailySleep.length > 0
    ? Math.round((dailySleep.reduce((a, b) => a + b, 0) / dailySleep.length) * 10) / 10
    : null;
  const sleepDisplay = thisWeekCheckin?.sleep_hours
    ? `${thisWeekCheckin.sleep_hours}h`
    : avgDailySleep != null
      ? `${avgDailySleep}h`
      : "-";
  const weekNumber = getISOWeek(today);

  return {
    consumedCals,
    targetCals,
    adherence,
    daysWithLogs,
    stepsDisplay,
    sleepDisplay,
    hasCheckinThisWeek: thisWeekCheckin != null,
    weekNumber,
    hasSessionToday: (sessionCount.count ?? 0) > 0,
    hasBilanToday: (bilanCount.count ?? 0) > 0,
    weighInToday: (weighInCount.count ?? 0) > 0,
    todayStr,
  };
}
