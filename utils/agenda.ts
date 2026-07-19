import { createAdminClient } from "@/lib/supabase-admin";

export interface ScheduleBlock {
  id: string;
  owner_id: string;
  day_of_week: number; // 1 = lundi ... 7 = dimanche
  start_time: string; // "HH:MM:SS"
  end_time: string;
  label: string;
  color: string;
  notes: string | null;
  created_at: string;
}

export const DAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// Client admin (bypass RLS) comme côté écriture (voir actions.ts) — le
// client lié aux cookies (RLS) renvoyait un tableau vide en lecture même
// pour le propriétaire du bloc, ce qui faisait disparaître les blocs
// fraîchement créés dès qu'on rafraîchissait la page.
export async function getScheduleBlocks(ownerId: string): Promise<ScheduleBlock[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("owner_id", ownerId)
      .order("day_of_week")
      .order("start_time");
    if (error) {
      console.error("getScheduleBlocks:", error.message);
      return [];
    }
    return (data as ScheduleBlock[]) ?? [];
  } catch (e) {
    console.error("getScheduleBlocks:", e);
    return [];
  }
}
