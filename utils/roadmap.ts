import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCoachForClient } from "@/utils/insert-notification";
import { notifyUser } from "@/lib/notify";
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

// ── Détection automatique des objectifs de poids atteints ──────────────────
// Avant, un objectif "Poids" ne se cochait "atteint" que si le coach (ou le
// client en autonomie) pensait à revenir sur la road map pour cocher la
// case à la main — alors que le poids est déjà loggé chaque matin dans le
// bilan quotidien. Appelé en fire-and-forget juste après l'enregistrement
// d'un poids (voir app/dashboard/client/bilan/actions.ts et
// app/dashboard/coach/moi/bilan/actions.ts), jamais dans le chemin critique
// de la sauvegarde du bilan lui-même.
//
// Portée volontairement limitée aux objectifs de type "weight" : c'est le
// seul type dont la valeur vit déjà ailleurs dans l'app sous une forme non
// ambiguë (daily_logs.weight_morning). Un objectif "Mensuration" pointe vers
// un libellé libre ("Tour de taille") qu'il faudrait faire correspondre à
// une colonne précise de measurements — trop de place à l'erreur pour un
// rapprochement automatique, on laisse ça à la coche manuelle.
export async function checkWeightObjectiveAchievements(
  clientId: string,
  latestWeight: number,
  logDate: string
): Promise<void> {
  try {
    const { roadmap, objectives } = await getClientRoadmap(clientId);
    if (!roadmap) return;

    const pending = objectives.filter(
      (o) => o.type === "weight" && !o.is_achieved && o.target_value != null
    );
    if (pending.length === 0) return;

    const supabase = createAdminClient();

    // Référence pour déduire le sens de l'objectif (perdre vs prendre) : le
    // dernier poids connu à ou avant le début de la road map, sinon (aucun
    // poids loggé avant cette date) le tout premier poids jamais loggé.
    const { data: beforeStart } = await supabase
      .from("daily_logs")
      .select("weight_morning")
      .eq("client_id", clientId)
      .lte("log_date", roadmap.start_date)
      .not("weight_morning", "is", null)
      .order("log_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    let baseline = (beforeStart as { weight_morning: number } | null)?.weight_morning ?? null;
    if (baseline == null) {
      const { data: earliest } = await supabase
        .from("daily_logs")
        .select("weight_morning")
        .eq("client_id", clientId)
        .not("weight_morning", "is", null)
        .order("log_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      baseline = (earliest as { weight_morning: number } | null)?.weight_morning ?? null;
    }
    if (baseline == null) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", clientId)
      .maybeSingle();
    const ownRoadmapUrl =
      (profile as { role: string } | null)?.role === "coach" ? "/dashboard/coach/moi/roadmap" : "/dashboard/client/roadmap";

    const coach = await getCoachForClient(clientId);

    for (const obj of pending) {
      const target = obj.target_value as number;
      if (target === baseline) continue; // sens indéterminable, on ne devine pas

      const isLossGoal = target < baseline;
      const achieved = isLossGoal ? latestWeight <= target : latestWeight >= target;
      if (!achieved) continue;

      const { error: updateError } = await supabase
        .from("roadmap_objectives")
        .update({ is_achieved: true, achieved_at: logDate })
        .eq("id", obj.id);
      if (updateError) continue;

      const unit = obj.target_unit ?? "kg";
      await notifyUser(clientId, {
        type: "roadmap_objective_achieved",
        title: "🎉 Objectif atteint",
        body: `Bravo, tu as atteint "${obj.label}" (${target} ${unit}) !`,
        url: ownRoadmapUrl,
      });

      if (coach) {
        await notifyUser(coach.id, {
          type: "roadmap_objective_achieved",
          title: "🎉 Objectif de road map atteint",
          body: `Un client a atteint son objectif "${obj.label}" (${target} ${unit}).`,
          url: `/dashboard/coach/clients/${clientId}/roadmap`,
          senderId: clientId,
        });
      }
    }
  } catch (e) {
    console.error("checkWeightObjectiveAchievements error:", e);
  }
}
