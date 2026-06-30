import { createAdminClient } from "@/lib/supabase-admin";

export type ExerciseCategory = "compose" | "isolation";
export type ExerciseDifficulty = "debutant" | "intermediaire" | "avance";

export interface LibraryExercise {
  id: string;
  name: string;
  muscle_group: string;
  muscle_subgroup: string | null;
  equipment: string | null;
  brand: string | null;
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
    // Shared reference content (not user-scoped) — read via the admin client
    // so display never depends on RLS being configured a particular way on
    // this table (it's meant to be world-readable for every signed-in member).
    const supabase = createAdminClient();
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
