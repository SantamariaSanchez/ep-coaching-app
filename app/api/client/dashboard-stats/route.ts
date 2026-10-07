import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
export const revalidate = 0; // always fresh — this is the daily dashboard
import { getTodayLogs, getLast7DaysLogs, getNutritionProfile } from "@/utils/nutrition";
import { getThisWeekCheckin, getISOWeek } from "@/utils/checkins";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(
    `client-dashboard-stats:${guard.userId}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const supabase = await createServerSupabase();

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const [nutritionProfile, todayLogs, last7DaysLogs, thisWeekCheckin, sessionCount, bilanCount, weighInCount, recentSleep] =
    await Promise.all([
      getNutritionProfile(guard.userId),
      getTodayLogs(guard.userId),
      getLast7DaysLogs(guard.userId),
      getThisWeekCheckin(guard.userId),
      // Did the user log a workout today?
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("client_id", guard.userId)
        .eq("session_date", todayStr)
        .eq("is_completed", true),
      // Did the user fill their daily bilan today?
      supabase
        .from("daily_logs")
        .select("id", { count: "exact", head: true })
        .eq("client_id", guard.userId)
        .eq("log_date", todayStr),
      // Le poids du matin est un champ du bilan quotidien mais mérite son
      // propre non-négociable — un bilan peut être rempli sans poids renseigné,
      // et "se peser le matin" est le premier réflexe qu'on veut jamais rater.
      supabase
        .from("daily_logs")
        .select("id", { count: "exact", head: true })
        .eq("client_id", guard.userId)
        .eq("log_date", todayStr)
        .not("weight_morning", "is", null),
      // Sommeil des 7 derniers bilans quotidiens : le check-in hebdo est
      // réservé aux clients accompagnés, un membre gratuit n'avait donc
      // jamais de sommeil affiché alors qu'il le note chaque jour au bilan.
      supabase
        .from("daily_logs")
        .select("sleep_hours")
        .eq("client_id", guard.userId)
        .gte("log_date", sevenDaysAgoStr)
        .not("sleep_hours", "is", null),
    ]);

  const consumedCals = Math.round(
    todayLogs.reduce((s, l) => s + (l.calories ?? 0), 0)
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

  return NextResponse.json({
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
  });
}
