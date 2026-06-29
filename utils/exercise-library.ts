import { createServerSupabase } from "@/lib/supabase-server";

export type ExerciseCategory = "compose" | "isolation";
export type ExerciseDifficulty = "debutant" | "intermediaire" | "avance";

export interface LibraryExercise {
  id: string;
  name: string;
  muscle_group: string;
  muscle_subgroup: string | null;
  equipment: string | null;
  category: ExerciseCategory | null;
  difficulty: ExerciseDifficulty | null;
  instructions: string | null;
  video_url: string | null;
  created_by: string | null;
  is_official: boolean;
  created_at: string;
}

export async function getExerciseLibrary(): Promise<LibraryExercise[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("exercise_library")
      .select("*")
      .order("muscle_group")
      .order("name");
    return (data as LibraryExercise[]) ?? [];
  } catch {
    return [];
  }
}
