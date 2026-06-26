import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Exercise {
  id: string;
  day_id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  rir: number | null;
  rest_seconds: number | null;
  notes: string | null;
  position: number;
  muscle_group: string | null;
  muscle_subgroup: string | null;
  is_direct: boolean;
}

export interface ProgramDay {
  id: string;
  program_id: string;
  day_label: string;
  position: number;
  exercises: Exercise[];
}

export interface Program {
  id: string;
  client_id: string;
  name: string;
  type: string | null;
  frequency: number | null;
  created_at: string;
  is_active: boolean;
}

export interface ProgramWithDays extends Program {
  days: ProgramDay[];
}

// Input types used by the editor and server actions
export interface ExerciseInput {
  name: string;
  sets: number | null;
  reps: string | null;
  rir: number | null;
  rest_seconds: number | null;
  notes: string | null;
  muscle_group: string | null;
  muscle_subgroup: string | null;
  is_direct: boolean;
}

export interface DayInput {
  day_label: string;
  exercises: ExerciseInput[];
}

export interface ProgramInput {
  name: string;
  type: string | null;
  frequency: number | null;
  days: DayInput[];
}

export async function getActiveProgram(
  clientId: string
): Promise<ProgramWithDays | null> {
  try {
    const supabase = await createServerSupabase();

    const { data: program } = await supabase
      .from("programs")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!program) return null;

    const { data: days } = await supabase
      .from("program_days")
      .select("*")
      .eq("program_id", program.id)
      .order("position");

    if (!days || days.length === 0) {
      return { ...(program as Program), days: [] };
    }

    const dayIds = (days as ProgramDay[]).map((d) => d.id);

    const { data: exercises } = await supabase
      .from("exercises")
      .select("*")
      .in("day_id", dayIds)
      .order("position");

    const daysWithExercises: ProgramDay[] = (days as ProgramDay[]).map(
      (day) => ({
        ...day,
        exercises: ((exercises ?? []) as Exercise[]).filter(
          (e) => e.day_id === day.id
        ),
      })
    );

    return { ...(program as Program), days: daysWithExercises };
  } catch {
    return null;
  }
}

// Shared by the coach's program editor and the client's self-serve editor —
// only the caller's auth guard differs, the write logic is identical.
export async function saveProgramForClient(
  supabase: SupabaseClient,
  clientId: string,
  input: ProgramInput
): Promise<{ error?: string }> {
  try {
    // Deactivate the existing active program instead of deleting it — old exercises
    // are referenced by logbook/session history (session_sets, personal_records),
    // so a hard delete fails on a foreign key violation. getActiveProgram() only
    // reads programs where is_active = true, so deactivating is enough.
    const { error: deactivateError } = await supabase
      .from("programs")
      .update({ is_active: false })
      .eq("client_id", clientId)
      .eq("is_active", true);

    if (deactivateError) {
      console.error("saveProgramForClient: failed to deactivate old program", deactivateError);
      return { error: "Erreur lors de la suppression de l'ancien programme." };
    }

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
          muscle_subgroup: ex.muscle_subgroup || null,
          is_direct: ex.is_direct,
        });
        if (exError) {
          return { error: `Erreur lors de l'ajout de l'exercice "${ex.name}".` };
        }
      }
    }

    return {};
  } catch (err) {
    console.error("saveProgramForClient error:", err);
    return { error: "Une erreur inattendue est survenue." };
  }
}
