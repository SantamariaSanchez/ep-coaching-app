import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgramInput, DayInput } from "@/utils/programs";

// ── Modèles de programme réutilisables ──────────────────────────────────────
// Même forme que programs/program_days/exercises (utils/programs.ts), mais
// détachée de tout client : un modèle est la structure de conception d'un
// coach ("Push Pull Legs 5x/semaine"...), appliquée ensuite à un ou
// plusieurs clients pour générer leur programme réel (voir programTemplateToInput).

export interface ProgramTemplateExercise {
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

export interface ProgramTemplateDay {
  id: string;
  template_id: string;
  day_label: string;
  position: number;
  exercises: ProgramTemplateExercise[];
}

export interface ProgramTemplate {
  id: string;
  coach_id: string;
  name: string;
  type: string | null;
  frequency: number | null;
  objective: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramTemplateWithDays extends ProgramTemplate {
  days: ProgramTemplateDay[];
}

export interface ProgramTemplateInput {
  name: string;
  type: string | null;
  frequency: number | null;
  objective: string | null;
  notes: string | null;
  days: DayInput[];
}

function sortTemplate(row: ProgramTemplateWithDays): ProgramTemplateWithDays {
  return {
    ...row,
    days: [...(row.days ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((d) => ({
        ...d,
        exercises: [...(d.exercises ?? [])].sort((a, b) => a.position - b.position),
      })),
  };
}

export async function getCoachProgramTemplates(coachId: string): Promise<ProgramTemplateWithDays[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("program_templates")
      .select("*, program_template_days(*, program_template_exercises(*))")
      .eq("coach_id", coachId)
      .order("updated_at", { ascending: false });
    return ((data as unknown as (ProgramTemplateWithDays & { program_template_days: never })[]) ?? [])
      .map((row) => {
        const raw = row as unknown as ProgramTemplate & {
          program_template_days: (ProgramTemplateDay & { program_template_exercises: ProgramTemplateExercise[] })[];
        };
        return sortTemplate({
          ...raw,
          days: raw.program_template_days.map((d) => ({ ...d, exercises: d.program_template_exercises })),
        });
      });
  } catch {
    return [];
  }
}

export async function getProgramTemplateById(
  templateId: string,
  coachId: string,
  supabaseOverride?: SupabaseClient
): Promise<ProgramTemplateWithDays | null> {
  try {
    const supabase = supabaseOverride ?? (await createServerSupabase());
    const { data } = await supabase
      .from("program_templates")
      .select("*, program_template_days(*, program_template_exercises(*))")
      .eq("id", templateId)
      .eq("coach_id", coachId)
      .maybeSingle();
    if (!data) return null;
    const raw = data as unknown as ProgramTemplate & {
      program_template_days: (ProgramTemplateDay & { program_template_exercises: ProgramTemplateExercise[] })[];
    };
    return sortTemplate({
      ...raw,
      days: raw.program_template_days.map((d) => ({ ...d, exercises: d.program_template_exercises })),
    });
  } catch {
    return null;
  }
}

// Crée ou met à jour un modèle. En édition, la structure (jours + exercices)
// repart de zéro plutôt qu'un diff ligne à ligne — un modèle n'est référencé
// par aucun historique de séance (contrairement à un programme client réel
// une fois assigné), donc aucun risque de violation de clé étrangère.
export async function saveProgramTemplate(
  supabase: SupabaseClient,
  coachId: string,
  templateId: string | null,
  input: ProgramTemplateInput
): Promise<{ id?: string; error?: string }> {
  try {
    let id = templateId;

    if (id) {
      const { error: updateError } = await supabase
        .from("program_templates")
        .update({
          name: input.name.trim(),
          type: input.type || null,
          frequency: input.frequency ?? null,
          objective: input.objective || null,
          notes: input.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("coach_id", coachId);
      if (updateError) return { error: "Erreur lors de la mise à jour du modèle." };

      const { error: delError } = await supabase
        .from("program_template_days")
        .delete()
        .eq("template_id", id);
      if (delError) return { error: "Erreur lors de la mise à jour de la structure." };
    } else {
      const { data: template, error: insertError } = await supabase
        .from("program_templates")
        .insert({
          coach_id: coachId,
          name: input.name.trim(),
          type: input.type || null,
          frequency: input.frequency ?? null,
          objective: input.objective || null,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (insertError || !template) return { error: "Erreur lors de la création du modèle." };
      id = template.id;
    }

    if (input.days.length > 0) {
      const { data: dayRows, error: daysError } = await supabase
        .from("program_template_days")
        .insert(
          input.days.map((day, i) => ({
            template_id: id,
            day_label: day.day_label || `Séance ${i + 1}`,
            position: i,
          }))
        )
        .select();
      if (daysError || !dayRows) return { error: "Erreur lors de la création des séances." };

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
        }))
      );

      if (exerciseRows.length > 0) {
        const { error: exError } = await supabase.from("program_template_exercises").insert(exerciseRows);
        if (exError) return { error: "Erreur lors de l'ajout des exercices." };
      }
    }

    return { id: id! };
  } catch (err) {
    console.error("saveProgramTemplate error:", err);
    return { error: "Une erreur inattendue est survenue." };
  }
}

export async function deleteProgramTemplate(
  supabase: SupabaseClient,
  templateId: string,
  coachId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("program_templates")
    .delete()
    .eq("id", templateId)
    .eq("coach_id", coachId);
  if (error) return { error: "Erreur lors de la suppression du modèle." };
  return {};
}

// Convertit un modèle en ProgramInput prêt pour saveProgramForClient —
// l'application d'un modèle à un client passe par exactement le même
// chemin de code que la création manuelle d'un programme, aucune logique
// dupliquée entre les deux.
export function programTemplateToInput(template: ProgramTemplateWithDays, nameOverride?: string): ProgramInput {
  return {
    name: nameOverride?.trim() || template.name,
    type: template.type,
    frequency: template.frequency,
    days: template.days.map((d) => ({
      day_label: d.day_label,
      exercises: d.exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        rir: e.rir,
        rest_seconds: e.rest_seconds,
        notes: e.notes,
        muscle_group: e.muscle_group,
        muscle_subgroup: e.muscle_subgroup,
        is_direct: e.is_direct,
      })),
    })),
  };
}
