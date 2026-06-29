"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth, requireCoach } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import type { ExerciseCategory, ExerciseDifficulty } from "@/utils/exercise-library";

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
    const supabase = await createServerSupabase();
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
    const supabase = await createServerSupabase();
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

export async function deleteExercise(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("exercise_library").delete().eq("id", id);
    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath("/dashboard/client/exercises");
    revalidatePath("/dashboard/coach/exercises");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
