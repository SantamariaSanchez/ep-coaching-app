import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Roadmap {
  id: string;
  client_id: string;
  created_by: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface RoadmapPhase {
  id: string;
  roadmap_id: string;
  type: string;
  label: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  position: number;
}

export interface RoadmapObjective {
  id: string;
  roadmap_id: string;
  type: string;
  label: string;
  target_date: string;
  target_value: number | null;
  target_unit: string | null;
  description: string | null;
  term: "short" | "medium" | "long";
  is_achieved: boolean;
  achieved_at: string | null;
}

export interface RoadmapWithData {
  roadmap: Roadmap | null;
  phases: RoadmapPhase[];
  objectives: RoadmapObjective[];
}

export async function getClientRoadmap(clientId: string): Promise<RoadmapWithData> {
  try {
    const supabase = await createServerSupabase();

    const { data: roadmap } = await supabase
      .from("roadmaps")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (!roadmap) return { roadmap: null, phases: [], objectives: [] };

    const [{ data: phases }, { data: objectives }] = await Promise.all([
      supabase
        .from("roadmap_phases")
        .select("*")
        .eq("roadmap_id", roadmap.id)
        .order("position"),
      supabase
        .from("roadmap_objectives")
        .select("*")
        .eq("roadmap_id", roadmap.id)
        .order("target_date"),
    ]);

    return {
      roadmap: roadmap as Roadmap,
      phases: (phases as RoadmapPhase[]) ?? [],
      objectives: (objectives as RoadmapObjective[]) ?? [],
    };
  } catch {
    return { roadmap: null, phases: [], objectives: [] };
  }
}

// ── Écriture partagée entre l'édition manuelle et l'application d'un modèle ──
// Extrait de l'ancienne logique inline de app/api/roadmap/[clientId]/route.ts
// (POST) : upsert de la road map (une seule par client) puis remplacement
// complet des phases et objectifs. L'application d'un modèle de road map
// (utils/roadmap-templates.ts) passe par exactement ce même chemin, aucune
// logique dupliquée entre édition manuelle et application de modèle.

export interface RoadmapApplyInput {
  start_date: string;
  end_date: string;
  phases: Omit<RoadmapPhase, "id" | "roadmap_id">[];
  objectives: Omit<RoadmapObjective, "id" | "roadmap_id">[];
}

export async function applyRoadmapForClient(
  supabase: SupabaseClient,
  clientId: string,
  createdBy: string,
  input: RoadmapApplyInput
): Promise<{ roadmapId?: string; error?: string }> {
  const { data: roadmap, error: rmErr } = await supabase
    .from("roadmaps")
    .upsert(
      {
        client_id: clientId,
        created_by: createdBy,
        start_date: input.start_date,
        end_date: input.end_date,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" }
    )
    .select("id")
    .single();

  if (rmErr || !roadmap) {
    console.error("applyRoadmapForClient upsert error:", rmErr);
    return { error: "Erreur lors de la sauvegarde de la road map." };
  }

  const roadmapId = (roadmap as { id: string }).id;

  const { error: delPhasesError } = await supabase.from("roadmap_phases").delete().eq("roadmap_id", roadmapId);
  if (delPhasesError) return { error: "Erreur lors du remplacement des phases." };
  if (input.phases.length > 0) {
    const { error } = await supabase
      .from("roadmap_phases")
      .insert(input.phases.map((p, i) => ({ ...p, roadmap_id: roadmapId, position: i })));
    if (error) return { error: "Erreur lors de l'ajout des phases." };
  }

  const { error: delObjectivesError } = await supabase.from("roadmap_objectives").delete().eq("roadmap_id", roadmapId);
  if (delObjectivesError) return { error: "Erreur lors du remplacement des objectifs." };
  if (input.objectives.length > 0) {
    const { error } = await supabase
      .from("roadmap_objectives")
      .insert(input.objectives.map((o) => ({ ...o, roadmap_id: roadmapId })));
    if (error) return { error: "Erreur lors de l'ajout des objectifs." };
  }

  return { roadmapId };
}
