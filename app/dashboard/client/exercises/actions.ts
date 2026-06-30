"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { requireAuth, requireCoach } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import type { ExerciseCategory, ExerciseDifficulty } from "@/utils/exercise-library";
import { EXERCISE_LIBRARY_SEED } from "@/lib/exercise-library-seed";

export interface CreateExerciseInput {
  name: string;
  muscle_group: string;
  muscle_subgroup: string | null;
  equipment: string | null;
  category: ExerciseCategory | null;
  difficulty: ExerciseDifficulty | null;
  instructions: string | null;
}

// Open to every authenticated member (free or paying client, or coach) —
// the whole point is to let the community enrich the library together.
export async function createExercise(input: CreateExerciseInput): Promise<{ error?: string; id?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!input.name.trim()) return { error: "Le nom de l'exercice est requis." };
  if (!input.muscle_group) return { error: "Le groupe musculaire est requis." };

  try {
    // Admin client — bypasses RLS regardless of how the table was set up,
    // since this is shared reference content, not user-scoped data.
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("exercise_library")
      .insert({
        name: input.name.trim(),
        muscle_group: input.muscle_group,
        muscle_subgroup: input.muscle_subgroup,
        equipment: input.equipment,
        category: input.category,
        difficulty: input.difficulty,
        instructions: input.instructions?.trim() || null,
        created_by: guard.userId,
        is_official: false,
      })
      .select("id")
      .single();

    if (error || !data) return { error: "Erreur lors de la création." };

    revalidatePath("/dashboard/client/exercises");
    revalidatePath("/dashboard/coach/exercises");
    return { id: data.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// Editing/attaching videos and deleting stays coach-only — keeps moderation
// of the shared library simple in a single-coach app.
export async function updateExercise(
  id: string,
  fields: Partial<CreateExerciseInput> & { video_url?: string | null }
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const updateData: Record<string, unknown> = {};
    if (fields.name !== undefined) updateData.name = fields.name.trim();
    if (fields.muscle_group !== undefined) updateData.muscle_group = fields.muscle_group;
    if (fields.muscle_subgroup !== undefined) updateData.muscle_subgroup = fields.muscle_subgroup;
    if (fields.equipment !== undefined) updateData.equipment = fields.equipment;
    if (fields.category !== undefined) updateData.category = fields.category;
    if (fields.difficulty !== undefined) updateData.difficulty = fields.difficulty;
    if (fields.instructions !== undefined) updateData.instructions = fields.instructions?.trim() || null;
    if (fields.video_url !== undefined) updateData.video_url = fields.video_url?.trim() || null;

    const { error } = await supabase.from("exercise_library").update(updateData).eq("id", id);
    if (error) return { error: "Erreur lors de la mise à jour." };

    revalidatePath("/dashboard/client/exercises");
    revalidatePath("/dashboard/coach/exercises");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// Imports the official exercise list straight from the app's code (see
// lib/exercise-library-seed.ts) instead of relying on pasting hundreds of
// SQL rows by hand in the Supabase editor — far less error-prone, and safe
// to click more than once (only inserts names that don't already exist).
export async function seedOfficialExercises(): Promise<{ error?: string; inserted?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase
      .from("exercise_library")
      .select("name");
    if (fetchError) return { error: "Erreur lors de la lecture de la bibliothèque." };

    const existingNames = new Set((existing ?? []).map((r) => r.name));
    const missing = EXERCISE_LIBRARY_SEED.filter((e) => !existingNames.has(e.name));
    if (missing.length === 0) return { inserted: 0 };

    const { error } = await supabase.from("exercise_library").insert(
      missing.map((e) => ({
        name: e.name,
        muscle_group: e.muscle_group,
        muscle_subgroup: e.muscle_subgroup,
        equipment: e.equipment,
        category: e.category,
        difficulty: e.difficulty,
        instructions: e.instructions,
        created_by: null,
        is_official: true,
      }))
    );
    if (error) return { error: "Erreur lors de l'import." };

    revalidatePath("/dashboard/client/exercises");
    revalidatePath("/dashboard/coach/exercises");
    return { inserted: missing.length };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteExercise(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("exercise_library").delete().eq("id", id);
    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath("/dashboard/client/exercises");
    revalidatePath("/dashboard/coach/exercises");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
