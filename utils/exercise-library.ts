import { createAdminClient } from "@/lib/supabase-admin";
import { unstable_cache } from "next/cache";

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
  // Bagage d'accessoires choisi explicitement par le coach pour CET
  // exercice (noms tirés de ACCESSORY_CATALOG, lib/session-accessories.ts)
  // — voir migration 20260910a. Vide = pas encore renseigné : depuis le
  // 2026-09-10 rien ne s'affiche en séance dans ce cas (plus de devinette
  // par mots-clés utilisée comme filet, voir accessoriesForSession).
  accessories: string[];
}

// 642 lignes, quasi identiques d'un chargement à l'autre (référence
// partagée, voir commentaire ci-dessous). Mise en cache 1h ; createExercise/
// updateExercise/deleteExercise/seedOfficialExercises
// (app/dashboard/client/exercises/actions.ts) purgent le tag
// "exercise-library" dès qu'un exercice change.
export const getExerciseLibrary = unstable_cache(
  async (): Promise<LibraryExercise[]> => {
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
  },
  ["exercise-library"],
  { tags: ["exercise-library"], revalidate: 3600 }
);

// Carte nom -> bagage d'accessoires choisi, pour accessoriesForSession
// (lib/session-accessories.ts). Un seul point d'appel plutôt que de refaire
// le Object.fromEntries à chaque page qui affiche "à prévoir" (Programme,
// Logbook, séance en cours, aperçu du jour côté coach).
export async function getAccessoriesByExerciseName(): Promise<Record<string, string[]>> {
  const library = await getExerciseLibrary();
  return Object.fromEntries(library.map((ex) => [ex.name, ex.accessories ?? []]));
}

export interface MissingVideoExercise {
  name: string;
  muscleGroup: string;
  timesPrescribed: number;
}

// Sur 642 exercices, 0 avaient une vidéo au moment de ce chantier — "642
// exercices à faire" n'est pas une liste exploitable. Ici, seulement ceux
// réellement prescrits dans de vrais programmes clients, triés par
// fréquence — une jointure par nom (pas de vraie clé étrangère entre
// `exercises`, la table des séances clients, et `exercise_library`, texte
// libre des deux côtés), faite en mémoire plutôt qu'en SQL : les deux
// tables restent petites (centaines à quelques milliers de lignes).
export async function getTopExercisesMissingVideo(limit = 20): Promise<MissingVideoExercise[]> {
  try {
    const supabase = createAdminClient();
    const [{ data: withoutVideo }, { data: prescribed }] = await Promise.all([
      supabase.from("exercise_library").select("name, muscle_group").is("video_url", null),
      supabase.from("exercises").select("name"),
    ]);
    if (!withoutVideo || !prescribed) return [];

    const counts = new Map<string, number>();
    for (const row of prescribed as { name: string }[]) {
      counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
    }

    return (withoutVideo as { name: string; muscle_group: string }[])
      .map((ex) => ({ name: ex.name, muscleGroup: ex.muscle_group, timesPrescribed: counts.get(ex.name) ?? 0 }))
      .filter((ex) => ex.timesPrescribed > 0)
      .sort((a, b) => b.timesPrescribed - a.timesPrescribed)
      .slice(0, limit);
  } catch {
    return [];
  }
}
