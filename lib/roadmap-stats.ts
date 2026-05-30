"use client";

import { createClientSupabase } from "@/lib/supabase-client";
import { getWeekPerformanceColor, type PerformanceKey } from "@/lib/roadmap-colors";

export interface WeekStat {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  checkinExists: boolean;
  nutritionDays: number;
  sessionsDone: number;
  sessionsPlanned: number;
  avgCalories: number;
  avgWeight: number | null;
  performanceKey: PerformanceKey;
}

export async function getWeekStats(
  clientId: string,
  startDate: string,
  endDate: string
): Promise<WeekStat[]> {
  const supabase = createClientSupabase();
  const stats: WeekStat[] = [];

  const end = new Date(endDate);

  // Align current to Monday of the start week
  let current = new Date(startDate);
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  current.setDate(diff);

  let weekNum = 1;

  while (current <= end) {
    const weekStart = current.toISOString().split("T")[0];
    const weekEndDate = new Date(current);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEnd = weekEndDate.toISOString().split("T")[0];
    const isFuture = new Date(weekStart) > new Date();

    if (!isFuture) {
      try {
        const [checkinRes, foodRes, sessionRes] = await Promise.all([
          supabase
            .from("check_ins")
            .select("id, weight")
            .eq("client_id", clientId)
            .gte("week_start", weekStart)
            .lte("week_start", weekEnd)
            .limit(1),
          supabase
            .from("food_logs")
            .select("logged_at, calories")
            .eq("client_id", clientId)
            .gte("logged_at", weekStart)
            .lte("logged_at", weekEnd),
          supabase
            .from("sessions")
            .select("id, is_completed")
            .eq("client_id", clientId)
            .gte("session_date", weekStart)
            .lte("session_date", weekEnd),
        ]);

        const checkinExists = (checkinRes.data?.length ?? 0) > 0;
        const nutritionDays = new Set(
          (foodRes.data ?? []).map((f: { logged_at: string }) =>
            f.logged_at.split("T")[0]
          )
        ).size;
        const sessions = sessionRes.data ?? [];
        const sessionsDone = (sessions as { is_completed: boolean }[]).filter(
          (s) => s.is_completed
        ).length;
        const sessionsPlanned = sessions.length;

        const logs = foodRes.data ?? [];
        const totalCals = (logs as { calories: number | null }[]).reduce(
          (s, l) => s + (l.calories ?? 0),
          0
        );
        const avgCalories = logs.length > 0 ? Math.round(totalCals / logs.length) : 0;

        const perfKey = getWeekPerformanceColor(
          checkinExists,
          nutritionDays,
          sessionsDone,
          sessionsPlanned,
          false
        );

        stats.push({
          weekStart,
          weekEnd,
          weekNumber: weekNum,
          checkinExists,
          nutritionDays,
          sessionsDone,
          sessionsPlanned,
          avgCalories,
          avgWeight:
            (checkinRes.data as { weight: number | null }[] | null)?.[0]
              ?.weight ?? null,
          performanceKey: perfKey,
        });
      } catch {
        stats.push({
          weekStart, weekEnd, weekNumber: weekNum,
          checkinExists: false, nutritionDays: 0,
          sessionsDone: 0, sessionsPlanned: 0,
          avgCalories: 0, avgWeight: null,
          performanceKey: "empty",
        });
      }
    } else {
      stats.push({
        weekStart, weekEnd, weekNumber: weekNum,
        checkinExists: false, nutritionDays: 0,
        sessionsDone: 0, sessionsPlanned: 0,
        avgCalories: 0, avgWeight: null,
        performanceKey: "future",
      });
    }

    current.setDate(current.getDate() + 7);
    weekNum++;
  }

  return stats;
}
