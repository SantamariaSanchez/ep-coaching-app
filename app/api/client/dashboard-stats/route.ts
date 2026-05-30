import { NextResponse } from "next/server";
export const revalidate = 30;
import { getUser } from "@/utils/auth";
import { getTodayLogs, getLast7DaysLogs, getNutritionProfile } from "@/utils/nutrition";
import { getThisWeekCheckin, getISOWeek } from "@/utils/checkins";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();

  const [nutritionProfile, todayLogs, last7DaysLogs, thisWeekCheckin] =
    await Promise.all([
      getNutritionProfile(user.id),
      getTodayLogs(user.id),
      getLast7DaysLogs(user.id),
      getThisWeekCheckin(user.id),
    ]);

  const consumedCals = Math.round(
    todayLogs.reduce((s, l) => s + (l.calories ?? 0), 0)
  );
  const targetCals = nutritionProfile?.calories_target ?? 0;

  // Adherence last 7 days
  const logDates = new Set(last7DaysLogs.map((l) => l.logged_at.split("T")[0]));
  const daysWithLogs = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d.toISOString().split("T")[0];
  }).filter((d) => logDates.has(d)).length;
  const adherence = Math.round((daysWithLogs / 7) * 100);

  const stepsDisplay = thisWeekCheckin?.steps_per_day
    ? thisWeekCheckin.steps_per_day.toLocaleString("fr-FR")
    : "—";
  const sleepDisplay = thisWeekCheckin?.sleep_hours
    ? `${thisWeekCheckin.sleep_hours}h`
    : "—";
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
  });
}
