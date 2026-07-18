import { createServerSupabase } from "@/lib/supabase-server";

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

export async function getScheduleBlocks(ownerId: string): Promise<ScheduleBlock[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("owner_id", ownerId)
      .order("day_of_week")
      .order("start_time");
    return (data as ScheduleBlock[]) ?? [];
  } catch {
    return [];
  }
}
