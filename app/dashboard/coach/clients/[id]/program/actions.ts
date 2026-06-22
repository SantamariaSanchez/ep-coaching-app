"use server";
import { requireCoach } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import type { ProgramInput } from "@/utils/programs";

export async function saveProgram(
  clientId: string,
  input: ProgramInput
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  try {
    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

    // Find existing active program(s) so we can delete children before the parent —
    // the FK from program_days/exercises to programs isn't ON DELETE CASCADE in the DB,
    // so deleting the program directly fails with a foreign key violation.
    const { data: oldPrograms, error: oldProgramsError } = await supabase
      .from("programs")
      .select("id")
      .eq("client_id", clientId)
      .eq("is_active", true);

    if (oldProgramsError) {
      console.error("saveProgram: failed to load old programs", oldProgramsError);
      return { error: "Erreur lors de la suppression de l'ancien programme." };
    }

    const oldProgramIds = (oldPrograms ?? []).map((p) => p.id);

    if (oldProgramIds.length > 0) {
      const { data: oldDays, error: oldDaysError } = await supabase
        .from("program_days")
        .select("id")
        .in("program_id", oldProgramIds);

      if (oldDaysError) {
        console.error("saveProgram: failed to load old days", oldDaysError);
        return { error: "Erreur lors de la suppression de l'ancien programme." };
      }

      const oldDayIds = (oldDays ?? []).map((d) => d.id);

      if (oldDayIds.length > 0) {
        const { error: deleteExercisesError } = await supabase
          .from("exercises")
          .delete()
          .in("day_id", oldDayIds);

        if (deleteExercisesError) {
          console.error("saveProgram: failed to delete old exercises", deleteExercisesError);
          return { error: "Erreur lors de la suppression de l'ancien programme." };
        }
      }

      const { error: deleteDaysError } = await supabase
        .from("program_days")
        .delete()
        .in("program_id", oldProgramIds);

      if (deleteDaysError) {
        console.error("saveProgram: failed to delete old days", deleteDaysError);
        return { error: "Erreur lors de la suppression de l'ancien programme." };
      }

      const { error: deleteError } = await supabase
        .from("programs")
        .delete()
        .in("id", oldProgramIds);

      if (deleteError) {
        console.error("saveProgram: failed to delete old program", deleteError);
        return { error: "Erreur lors de la suppression de l'ancien programme." };
      }
    }

    // Create new program
    const { data: program, error: programError } = await supabase
      .from("programs")
      .insert({
        client_id: clientId,
        name: input.name.trim(),
        type: input.type || null,
        frequency: input.frequency ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (programError || !program) {
      return { error: "Erreur lors de la création du programme." };
    }

    // Insert days + exercises in order
    for (let i = 0; i < input.days.length; i++) {
      const day = input.days[i];

      const { data: dayRow, error: dayError } = await supabase
        .from("program_days")
        .insert({
          program_id: program.id,
          day_label: day.day_label || `Séance ${i + 1}`,
          position: i,
        })
        .select()
        .single();

      if (dayError || !dayRow) {
        return { error: `Erreur lors de la création de la séance ${i + 1}.` };
      }

      for (let j = 0; j < day.exercises.length; j++) {
        const ex = day.exercises[j];
        const { error: exError } = await supabase.from("exercises").insert({
          day_id: dayRow.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps || null,
          rir: ex.rir,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes || null,
          position: j,
          muscle_group: ex.muscle_group || null,
          is_direct: ex.is_direct,
        });
        if (exError) {
          return { error: `Erreur lors de l'ajout de l'exercice "${ex.name}".` };
        }
      }
    }

    revalidatePath(`/dashboard/coach/clients/${clientId}/program`);
    revalidatePath(`/dashboard/client/program`);
    return {};
  } catch (err) {
    console.error("saveProgram error:", err);
    return { error: "Une erreur inattendue est survenue." };
  }
}

export async function submitCorrectionFeedback(
  correctionId: string,
  clientId: string,
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const coach_feedback = (formData.get("coach_feedback") as string)?.trim();
  const coach_video_link =
    (formData.get("coach_video_link") as string)?.trim() || null;

  if (!coach_feedback) return { error: "Le retour écrit est obligatoire." };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
  const { error } = await supabase
    .from("exercise_corrections")
    .update({
      coach_feedback,
      coach_video_link,
      status: "answered",
      answered_at: new Date().toISOString(),
    })
    .eq("id", correctionId);

  if (error) return { error: "Erreur lors de l'envoi du retour." };

  revalidatePath(`/dashboard/coach/clients/${clientId}/program`);
  revalidatePath(`/dashboard/client/program`);
  revalidatePath(`/dashboard/coach`);
  return { success: true };
}
