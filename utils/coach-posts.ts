import { createServerSupabase } from "@/lib/supabase-server";

export interface CoachPost {
  id: string;
  author_id: string;
  coach_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function getCoachPosts(coachId: string, limit = 50): Promise<CoachPost[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("coach_posts")
      .select("*")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as CoachPost[]) ?? [];
  } catch {
    return [];
  }
}
