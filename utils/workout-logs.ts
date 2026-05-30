import { createServerSupabase } from "@/lib/supabase-server";

export interface WorkoutLog {
  id: string;
  client_id: string;
  exercise_id: string | null;
  exercise_name: string;
  muscle_group: string;
  is_direct: boolean;
  sets_completed: number | null;
  reps: string | null;
  weight_kg: number | null;
  rir_actual: number | null;
  previous_weight_kg: number | null;
  logged_at: string;
  week_start: string | null;
  created_at: string;
}

/** Returns the last 14 days of workout logs for a client (most recent first). */
export async function getRecentWorkoutLogs(
  clientId: string
): Promise<WorkoutLog[]> {
  try {
    const supabase = await createServerSupabase();
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const sinceStr = since.toISOString().split("T")[0];

    const { data } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("client_id", clientId)
      .gte("logged_at", sinceStr)
      .order("logged_at", { ascending: false });

    return (data as WorkoutLog[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Returns a map of { exerciseNameLowerCase → most recent weight_kg }
 * for the given logs. Useful for progression comparison.
 */
export function buildWeightMap(logs: WorkoutLog[]): Record<string, number | null> {
  const map: Record<string, number | null> = {};
  for (const log of logs) {
    const key = log.exercise_name.toLowerCase();
    if (!(key in map)) {
      map[key] = log.weight_kg ?? null;
    }
  }
  return map;
}
