import { createServerSupabase } from "@/lib/supabase-server";

export interface ExerciseCorrection {
  id: string;
  client_id: string;
  exercise_name: string;
  objective: string;
  video_link: string;
  client_question: string | null;
  status: "pending" | "answered";
  coach_feedback: string | null;
  coach_video_link: string | null;
  created_at: string;
  answered_at: string | null;
}

export interface ExerciseCorrectionWithClient extends ExerciseCorrection {
  profiles: { full_name: string | null; email: string | null } | null;
}

export async function getClientCorrections(
  clientId: string
): Promise<ExerciseCorrection[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("exercise_corrections")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    return (data as ExerciseCorrection[]) ?? [];
  } catch {
    return [];
  }
}

export async function getPendingCorrectionsWithClient(): Promise<ExerciseCorrectionWithClient[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("exercise_corrections")
      .select("*, profiles:client_id(full_name, email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    return (data as ExerciseCorrectionWithClient[]) ?? [];
  } catch {
    return [];
  }
}

export async function getDoneCorrectionsWithClient(): Promise<ExerciseCorrectionWithClient[]> {
  try {
    const supabase = await createServerSupabase();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data } = await supabase
      .from("exercise_corrections")
      .select("*, profiles:client_id(full_name, email)")
      .eq("status", "answered")
      .gte("answered_at", thirtyDaysAgo.toISOString())
      .order("answered_at", { ascending: false });
    return (data as ExerciseCorrectionWithClient[]) ?? [];
  } catch {
    return [];
  }
}

export async function getPendingCorrectionsCount(): Promise<number> {
  try {
    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from("exercise_corrections")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    return count ?? 0;
  } catch {
    return 0;
  }
}
