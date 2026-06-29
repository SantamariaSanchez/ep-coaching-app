import { createServerSupabase } from "@/lib/supabase-server";

export interface CoachPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function getCoachPosts(limit = 50): Promise<CoachPost[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("coach_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as CoachPost[]) ?? [];
  } catch {
    return [];
  }
}

export async function getCoachPostById(id: string): Promise<CoachPost | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from("coach_posts").select("*").eq("id", id).maybeSingle();
    return (data as CoachPost) ?? null;
  } catch {
    return null;
  }
}
