import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Décisions du coach propres à CET exercice DANS CETTE séance — distinctes
// des attributs de classification de exercise_library (partagés par tous les
// coachs). Voir migration 20260807_exercise_assignment_design_decisions.
export type TensionFocus = "etire" | "mi_course" | "raccourci" | "complet";

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
  tension_focus?: TensionFocus | null;
  resistance_notes?: string | null;
  rom_notes?: string | null;
  availability_notes?: string | null;
  discomfort_notes?: string | null;
}

export interface ProgramDay {
  id: string;
  program_id: string;
  day_label: string;
  position: number;
  exercises: Exercise[];
  // Jour réel de la semaine (1=lundi...7=dimanche), voir migration
  // 20260807b_program_days_weekday — permet de placer la séance contre
  // l'agenda réel du client plutôt que de rester une étiquette abstraite.
  weekday?: number | null;
}

export interface Program {
  id: string;
  client_id: string;
  name: string;
  type: string | null;
  frequency: number | null;
  created_at: string;
  is_active: boolean;
  // Phase de conception (migration 20260806) — objectif de phase lisible par
  // le client, notes de conception privées du coach. Optionnels : tant que la
  // migration n'est pas passée en base, tout le reste continue de marcher.
  objective?: string | null;
  coach_notes?: string | null;
  // Budget de volume (migration 20260807c) — cibles de séries directes/semaine
  // par groupe musculaire, décidées avant la construction. Voir VolumeBudgetPanel.
  volume_targets?: Record<string, number> | null;
  // Périodisation de mésocycle (migration 20260923_program_mesocycle, Axe FM)
  // — voir lib/mesocycle.ts. NULL = pas de mésocycle suivi, comportement
  // historique inchangé.
  mesocycle_start_date?: string | null;
  mesocycle_weeks?: number | null;
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
  // Décisions de conception propres à ce client (voir migration
  // 20260807_exercise_assignment_design_decisions) — optionnelles côté type :
  // les modèles réutilisables, les imports de logbook et les presets de
  // démarrage n'ont pas de client précis pour qui décider, donc rien à
  // fournir ici dans ces cas-là.
  tension_focus?: TensionFocus | null;
  resistance_notes?: string | null;
  rom_notes?: string | null;
  availability_notes?: string | null;
  discomfort_notes?: string | null;
}

export interface DayInput {
  day_label: string;
  exercises: ExerciseInput[];
  weekday?: number | null;
}

export interface ProgramInput {
  name: string;
  type: string | null;
  frequency: number | null;
  days: DayInput[];
  objective?: string | null;
  coach_notes?: string | null;
  volume_targets?: Record<string, number> | null;
  mesocycle_start_date?: string | null;
  mesocycle_weeks?: number | null;
}

// Colonnes de conception ajoutées par la migration 20260806. Le code doit
// tourner que la migration soit passée ou non (elle s'exécute à la main dans
// le SQL Editor, le déploiement Vercel ne l'applique pas) : à l'écriture on
// réessaie sans ces colonnes, à la lecture on reste sur select("*").
function isUnknownColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  const msg = error.message ?? "";
  return /does not exist|could not find the .* column/i.test(msg);
}

export async function getActiveProgram(
  clientId: string,
  opts?: { includeCoachNotes?: boolean }
): Promise<ProgramWithDays | null> {
  try {
    const supabase = await createServerSupabase();

    const { data: programRow } = await supabase
      .from("programs")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!programRow) return null;

    // coach_notes est une note privée de conception : elle ne quitte le
    // serveur que pour les écrans coach qui la demandent explicitement, pour
    // ne jamais se retrouver dans le payload d'une page de l'espace client.
    const program = { ...(programRow as Program) };
    if (!opts?.includeCoachNotes) delete program.coach_notes;

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

    const baseRow = {
      client_id: clientId,
      name: input.name.trim(),
      type: input.type || null,
      frequency: input.frequency ?? null,
      is_active: true,
    };

    const designRow = {
      ...baseRow,
      objective: input.objective?.trim() || null,
      coach_notes: input.coach_notes?.trim() || null,
      volume_targets: input.volume_targets ?? null,
    };

    let { data: program, error: programError } = await supabase
      .from("programs")
      .insert({
        ...designRow,
        mesocycle_start_date: input.mesocycle_start_date ?? null,
        mesocycle_weeks: input.mesocycle_weeks ?? null,
      })
      .select()
      .single();

    // Migration 20260923_program_mesocycle pas encore exécutée dans le SQL
    // Editor : on retombe sur la ligne de conception SANS le mésocycle
    // plutôt que de tout perdre (objective/coach_notes/volume_targets
    // restent, seul le mésocycle échoue silencieusement à s'enregistrer).
    if (programError && isUnknownColumnError(programError)) {
      ({ data: program, error: programError } = await supabase
        .from("programs")
        .insert(designRow)
        .select()
        .single());
    }

    // Migration 20260806 pas encore exécutée dans le SQL Editor : on
    // recrée le programme sans AUCUN champ de conception plutôt que de
    // planter la sauvegarde du coach.
    if (programError && isUnknownColumnError(programError)) {
      ({ data: program, error: programError } = await supabase
        .from("programs")
        .insert(baseRow)
        .select()
        .single());
    }

    if (programError || !program) {
      return { error: "Erreur lors de la création du programme." };
    }

    // Un insert par jour puis un insert par exercice (en série) faisait
    // autant d'allers-retours réseau que de lignes à créer — pour un
    // programme de plusieurs séances, l'activation prenait plusieurs
    // secondes et paraissait figée. Deux inserts groupés suffisent.
    const { data: dayRows, error: daysError } = await supabase
      .from("program_days")
      .insert(
        input.days.map((day, i) => ({
          program_id: program.id,
          day_label: day.day_label || `Séance ${i + 1}`,
          position: i,
          weekday: day.weekday ?? null,
        }))
      )
      .select();

    if (daysError || !dayRows) {
      return { error: "Erreur lors de la création des séances." };
    }

    const sortedDayRows = [...dayRows].sort((a, b) => a.position - b.position);
    const exerciseRows = input.days.flatMap((day, i) =>
      day.exercises.map((ex, j) => ({
        day_id: sortedDayRows[i].id,
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
        tension_focus: ex.tension_focus || null,
        resistance_notes: ex.resistance_notes?.trim() || null,
        rom_notes: ex.rom_notes?.trim() || null,
        availability_notes: ex.availability_notes?.trim() || null,
        discomfort_notes: ex.discomfort_notes?.trim() || null,
      }))
    );

    if (exerciseRows.length > 0) {
      const { error: exError } = await supabase.from("exercises").insert(exerciseRows);
      if (exError) {
        return { error: "Erreur lors de l'ajout des exercices." };
      }
    }

    return {};
  } catch (err) {
    console.error("saveProgramForClient error:", err);
    return { error: "Une erreur inattendue est survenue." };
  }
}
