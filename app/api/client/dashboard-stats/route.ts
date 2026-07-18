import { NextResponse } from "next/server";
export const revalidate = 0; // always fresh — this is the daily dashboard
import { getUser } from "@/utils/auth";
import { getTodayLogs, getLast7DaysLogs, getNutritionProfile } from "@/utils/nutrition";
import { getThisWeekCheckin, getISOWeek } from "@/utils/checkins";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const supabase = await createServerSupabase();

  const [nutritionProfile, todayLogs, last7DaysLogs, thisWeekCheckin, sessionCount, bilanCount, weighInCount] =
    await Promise.all([
      getNutritionProfile(user.id),
      getTodayLogs(user.id),
      getLast7DaysLogs(user.id),
      getThisWeekCheckin(user.id),
      // Did the user log a workout today?
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.id)
        .eq("session_date", todayStr)
        .eq("is_completed", true),
      // Did the user fill their daily bilan today?
      supabase
        .from("daily_logs")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.id)
        .eq("log_date", todayStr),
      // Le poids du matin est un champ du bilan quotidien mais mérite son
      // propre non-négociable — un bilan peut être rempli sans poids renseigné,
      // et "se peser le matin" est le premier réflexe qu'on veut jamais rater.
      supabase
        .from("daily_logs")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.id)
        .eq("log_date", todayStr)
        .not("weight_morning", "is", null),
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
  const sleepDisplay = thisWeekCheckin?.sleep_hours
    ? `${thisWeekCheckin.sleep_hours}h`
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
