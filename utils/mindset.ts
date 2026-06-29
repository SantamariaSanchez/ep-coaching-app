import { createServerSupabase } from "@/lib/supabase-server";
import type { ProfileType, Environment, ObstacleKey } from "@/lib/mindset-content";

export interface MindsetProfile {
  id: string;
  client_id: string;
  profile_type: ProfileType | null;
  environment: Environment | null;
  main_obstacle: ObstacleKey | null;
  motivation_score: number | null;
  body_image_score: number | null;
  stress_score: number | null;
  discipline_score: number | null;
  quiz_completed_at: string | null;
  updated_at: string;
}

export interface MindsetHabitLog {
  id: string;
  client_id: string;
  habit_key: string;
  logged_at: string;
}

export interface MindsetJournalEntry {
  id: string;
  client_id: string;
  entry_date: string;
  prompt_key: string | null;
  content: string;
  mood: number | null;
  created_at: string;
}

export async function getMindsetProfile(clientId: string): Promise<MindsetProfile | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("mindset_profiles")
      .select("*")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(1);
    return (data?.[0] as MindsetProfile) ?? null;
  } catch {
    return null;
  }
}

export async function getHabitLogs(
  clientId: string,
  sinceDate: string
): Promise<MindsetHabitLog[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("mindset_habit_logs")
      .select("*")
      .eq("client_id", clientId)
      .gte("logged_at", sinceDate)
      .order("logged_at", { ascending: false });
    return (data as MindsetHabitLog[]) ?? [];
  } catch {
    return [];
  }
}

export async function getJournalEntries(
  clientId: string,
  limit = 20
): Promise<MindsetJournalEntry[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("mindset_journal_entries")
      .select("*")
      .eq("client_id", clientId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as MindsetJournalEntry[]) ?? [];
  } catch {
    return [];
  }
}
