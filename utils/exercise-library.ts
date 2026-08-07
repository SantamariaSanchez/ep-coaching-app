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
  // Attributs de classification — visibles/filtrables uniquement côté coach
  // dans le constructeur de programme, jamais affichés au client en séance.
  position: string | null;
  freedom_of_movement: string | null;
  is_unilateral: boolean | null;
  microloadable: boolean | null;
  easy_to_replicate: string | null;
  learning_difficulty: string | null;
  stability_demand: string | null;
  accessibility: string | null;
  // Adaptations/accessoires/installation — distinct des instructions
  // d'exécution du mouvement (voir migration 20260808b).
  setup_notes: string | null;
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
