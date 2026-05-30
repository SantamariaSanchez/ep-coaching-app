import { createServerSupabase } from "@/lib/supabase-server";

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
