import { createServerSupabase } from "@/lib/supabase-server";

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
