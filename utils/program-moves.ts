import { createAdminClient } from "@/lib/supabase-admin";
import type { DayMove } from "@/lib/program-moves";

/**
 * Séances décalées « juste cette semaine » pour la semaine commençant le
 * lundi `weekStart`. Lecture via le client admin (table sans politique RLS,
 * l'appelant a déjà vérifié l'accès au programme). Vide si la migration
 * 20261025 n'est pas passée.
 */
export async function getWeekMoves(programId: string, weekStart: string): Promise<DayMove[]> {
  try {
    const { data } = await createAdminClient()
      .from("program_day_moves")
      .select("day_id, weekday")
      .eq("program_id", programId)
      .eq("week_start", weekStart);
    return (data as DayMove[]) ?? [];
  } catch {
    return [];
  }
}
