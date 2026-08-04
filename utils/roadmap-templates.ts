import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoadmapPhase, RoadmapObjective, RoadmapApplyInput } from "@/utils/roadmap";

// ── Modèles de road map réutilisables ────────────────────────────────────────
// Même forme que roadmaps/roadmap_phases/roadmap_objectives (utils/roadmap.ts),
// mais détachée de tout client — même logique que program-templates.ts et
// diet-templates.ts. Un modèle est la structure de conception d'un coach
// ("Prépa compétition 12 semaines"...), appliquée ensuite à un ou plusieurs
// clients pour générer leur road map réelle (voir roadmapTemplateToApplyInput).
//
// Différence clé avec un programme/une diète : une road map n'a pas de date
// fixe dans un modèle (ça n'aurait aucun sens hors contexte client). Chaque
// phase et chaque jalon stocke un décalage en semaines par rapport à la date
// de démarrage, converti en vraie date seulement au moment de l'application.

export interface RoadmapTemplatePhase {
  id: string;
  template_id: string;
  type: string;
  label: string;
  start_week_offset: number;
  end_week_offset: number;
  notes: string | null;
  position: number;
}

export interface RoadmapTemplateMilestone {
  id: string;
  template_id: string;
  type: string;
  term: "short" | "medium" | "long";
  label: string;
  week_offset: number;
  target_value: number | null;
  target_unit: string | null;
  description: string | null;
  position: number;
}

export interface RoadmapTemplate {
  id: string;
  coach_id: string;
  name: string;
  objective: string | null;
  duration_weeks: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoadmapTemplateWithDetails extends RoadmapTemplate {
  phases: RoadmapTemplatePhase[];
  milestones: RoadmapTemplateMilestone[];
}

export interface RoadmapTemplateInput {
  name: string;
  objective: string | null;
  duration_weeks: number | null;
  notes: string | null;
  phases: Array<{
    type: string;
    label: string;
    start_week_offset: number;
    end_week_offset: number;
    notes: string | null;
  }>;
  milestones: Array<{
    type: string;
    term: "short" | "medium" | "long";
    label: string;
    week_offset: number;
    target_value: number | null;
    target_unit: string | null;
    description: string | null;
  }>;
}

function sortTemplate(row: RoadmapTemplateWithDetails): RoadmapTemplateWithDetails {
  return {
    ...row,
    phases: [...(row.phases ?? [])].sort((a, b) => a.position - b.position),
    milestones: [...(row.milestones ?? [])].sort((a, b) => a.position - b.position),
  };
}

export async function getCoachRoadmapTemplates(coachId: string): Promise<RoadmapTemplateWithDetails[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("roadmap_templates")
      .select("*, roadmap_template_phases(*), roadmap_template_milestones(*)")
      .eq("coach_id", coachId)
      .order("updated_at", { ascending: false });
    return ((data as unknown as RawTemplateRow[]) ?? []).map((row) =>
      sortTemplate({
        ...row,
        phases: row.roadmap_template_phases,
        milestones: row.roadmap_template_milestones,
      })
    );
  } catch {
    return [];
  }
}

interface RawTemplateRow extends RoadmapTemplate {
  roadmap_template_phases: RoadmapTemplatePhase[];
  roadmap_template_milestones: RoadmapTemplateMilestone[];
}

export async function getRoadmapTemplateById(
  templateId: string,
  coachId: string,
  supabaseOverride?: SupabaseClient
): Promise<RoadmapTemplateWithDetails | null> {
  try {
    const supabase = supabaseOverride ?? (await createServerSupabase());
    const { data } = await supabase
      .from("roadmap_templates")
      .select("*, roadmap_template_phases(*), roadmap_template_milestones(*)")
      .eq("id", templateId)
      .eq("coach_id", coachId)
      .maybeSingle();
    if (!data) return null;
    const raw = data as unknown as RawTemplateRow;
    return sortTemplate({
      ...raw,
      phases: raw.roadmap_template_phases,
      milestones: raw.roadmap_template_milestones,
    });
  } catch {
    return null;
  }
}

// Crée ou met à jour un modèle. En édition, la structure (phases + jalons)
// repart de zéro plutôt qu'un diff ligne à ligne — même choix que
// saveProgramTemplate : un modèle n'est référencé par aucun historique de
// check in, donc aucun risque de violation de clé étrangère.
export async function saveRoadmapTemplate(
  supabase: SupabaseClient,
  coachId: string,
  templateId: string | null,
  input: RoadmapTemplateInput
): Promise<{ id?: string; error?: string }> {
  try {
    let id = templateId;

    if (id) {
      const { error: updateError } = await supabase
        .from("roadmap_templates")
        .update({
          name: input.name.trim(),
          objective: input.objective || null,
          duration_weeks: input.duration_weeks ?? null,
          notes: input.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("coach_id", coachId);
      if (updateError) return { error: "Erreur lors de la mise à jour du modèle." };

      const { error: delPhasesError } = await supabase.from("roadmap_template_phases").delete().eq("template_id", id);
      if (delPhasesError) return { error: "Erreur lors de la mise à jour des phases." };

      const { error: delMilestonesError } = await supabase
        .from("roadmap_template_milestones")
        .delete()
        .eq("template_id", id);
      if (delMilestonesError) return { error: "Erreur lors de la mise à jour des jalons." };
    } else {
      const { data: template, error: insertError } = await supabase
        .from("roadmap_templates")
        .insert({
          coach_id: coachId,
          name: input.name.trim(),
          objective: input.objective || null,
          duration_weeks: input.duration_weeks ?? null,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (insertError || !template) return { error: "Erreur lors de la création du modèle." };
      id = template.id;
    }

    if (input.phases.length > 0) {
      const { error: phasesError } = await supabase.from("roadmap_template_phases").insert(
        input.phases.map((p, i) => ({
          template_id: id,
          type: p.type,
          label: p.label || "Phase",
          start_week_offset: p.start_week_offset,
          end_week_offset: p.end_week_offset,
          notes: p.notes || null,
          position: i,
        }))
      );
      if (phasesError) return { error: "Erreur lors de l'ajout des phases." };
    }

    if (input.milestones.length > 0) {
      const { error: milestonesError } = await supabase.from("roadmap_template_milestones").insert(
        input.milestones.map((m, i) => ({
          template_id: id,
          type: m.type,
          term: m.term,
          label: m.label || "Jalon",
          week_offset: m.week_offset,
          target_value: m.target_value,
          target_unit: m.target_unit || null,
          description: m.description || null,
          position: i,
        }))
      );
      if (milestonesError) return { error: "Erreur lors de l'ajout des jalons." };
    }

    return { id: id! };
  } catch (err) {
    console.error("saveRoadmapTemplate error:", err);
    return { error: "Une erreur inattendue est survenue." };
  }
}

export async function deleteRoadmapTemplate(
  supabase: SupabaseClient,
  templateId: string,
  coachId: string
): Promise<{ error?: string }> {
  const { error } = await supabase.from("roadmap_templates").delete().eq("id", templateId).eq("coach_id", coachId);
  if (error) return { error: "Erreur lors de la suppression du modèle." };
  return {};
}

function addWeeksToISODate(startDateISO: string, weeks: number): string {
  const d = new Date(`${startDateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.round(weeks * 7));
  return d.toISOString().slice(0, 10);
}

// Convertit un modèle (décalages en semaines) en RoadmapApplyInput (dates
// réelles) prêt pour applyRoadmapForClient — l'application d'un modèle à un
// client passe par exactement le même chemin de code que la sauvegarde
// manuelle d'une road map, aucune logique dupliquée entre les deux.
export function roadmapTemplateToApplyInput(
  template: RoadmapTemplateWithDetails,
  startDate: string
): RoadmapApplyInput {
  const maxPhaseWeek = template.phases.reduce((m, p) => Math.max(m, p.end_week_offset), 0);
  const maxMilestoneWeek = template.milestones.reduce((m, o) => Math.max(m, o.week_offset), 0);
  const totalWeeks = Math.max(template.duration_weeks ?? 0, maxPhaseWeek, maxMilestoneWeek, 1);

  const phases: Omit<RoadmapPhase, "id" | "roadmap_id">[] = template.phases.map((p) => ({
    type: p.type,
    label: p.label,
    start_date: addWeeksToISODate(startDate, p.start_week_offset),
    end_date: addWeeksToISODate(startDate, p.end_week_offset),
    notes: p.notes,
    position: p.position,
  }));

  const objectives: Omit<RoadmapObjective, "id" | "roadmap_id">[] = template.milestones.map((m) => ({
    type: m.type,
    label: m.label,
    target_date: addWeeksToISODate(startDate, m.week_offset),
    target_value: m.target_value,
    target_unit: m.target_unit,
    description: m.description,
    term: m.term,
    is_achieved: false,
    achieved_at: null,
  }));

  return {
    start_date: startDate,
    end_date: addWeeksToISODate(startDate, totalWeeks),
    phases,
    objectives,
  };
}
