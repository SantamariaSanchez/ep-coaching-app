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

    // Lecture seule pour des écrans d'appoint (nutrition, édition de
    // programme) et la détection des objectifs de poids : une erreur y reste
    // non bloquante, mais elle est journalisée au lieu d'être avalée en
    // silence (audit 2026-09-28). Les vues road map, elles, passent par
    // utils/phase-pilot.ts qui distingue "erreur" de "pas de road map".
    const { data: roadmap, error: roadmapError } = await supabase
      .from("roadmaps")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();
    if (roadmapError) console.error("getClientRoadmap roadmap error:", roadmapError);

    if (!roadmap) return { roadmap: null, phases: [], objectives: [] };

    const [{ data: phases, error: phasesError }, { data: objectives, error: objectivesError }] = await Promise.all([
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
    if (phasesError || objectivesError) {
      console.error("getClientRoadmap phases/objectives error:", phasesError ?? objectivesError);
    }

    return {
      roadmap: roadmap as Roadmap,
      phases: (phases as RoadmapPhase[]) ?? [],
      objectives: (objectives as RoadmapObjective[]) ?? [],
    };
  } catch (e) {
    console.error("getClientRoadmap error:", e);
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

// Sécurité des données (audit 2026-09-28) : l'ancienne version supprimait
// TOUTES les phases puis les réinsérait. Si l'insertion échouait après la
// suppression (base saturée, contrainte, coupure), la road map se retrouvait
// vide : les 6 phases de la prépa WNBF du fondateur pouvaient disparaître sur
// un simple incident. Pas de vraie transaction possible sans fonction SQL
// (donc sans migration) : on inverse l'ordre pour que chaque échec laisse
// l'ancienne version intacte.
//   1. on lit l'état actuel (dates + ids des phases et objectifs existants) ;
//   2. on INSÈRE d'abord les nouvelles lignes ;
//   3. on ne supprime les anciennes (par id) qu'une fois tout inséré ;
//   4. à chaque échec, on retire ce qu'on vient d'ajouter et on remet les
//      dates d'avant (au mieux, journalisé si ça échoue aussi).
// Les champs écrits sont listés un par un : un id ou un roadmap_id envoyé
// par le navigateur n'atteint jamais la base.

type PhaseInput = RoadmapApplyInput["phases"][number];
type ObjectiveInput = RoadmapApplyInput["objectives"][number];

function phaseRow(p: PhaseInput, roadmapId: string, position: number) {
  return {
    roadmap_id: roadmapId,
    type: p.type,
    label: p.label,
    start_date: p.start_date,
    end_date: p.end_date,
    notes: p.notes ?? null,
    position,
  };
}

function objectiveRow(o: ObjectiveInput, roadmapId: string) {
  return {
    roadmap_id: roadmapId,
    type: o.type,
    label: o.label,
    target_date: o.target_date,
    target_value: o.target_value ?? null,
    target_unit: o.target_unit ?? null,
    description: o.description ?? null,
    term: o.term,
    is_achieved: !!o.is_achieved,
    achieved_at: o.is_achieved ? o.achieved_at ?? null : null,
  };
}

export async function applyRoadmapForClient(
  supabase: SupabaseClient,
  clientId: string,
  createdBy: string,
  input: RoadmapApplyInput
): Promise<{ roadmapId?: string; error?: string }> {
  const UNTOUCHED = " La version précédente de la road map est intacte.";

  // 1. État actuel. Une lecture ratée ici = on n'écrit rien du tout.
  const { data: previous, error: prevErr } = await supabase
    .from("roadmaps")
    .select("id, start_date, end_date")
    .eq("client_id", clientId)
    .maybeSingle();
  if (prevErr) {
    console.error("applyRoadmapForClient read error:", prevErr);
    return { error: "Lecture de la road map actuelle impossible, rien n'a été modifié." };
  }
  const prev = previous as { id: string; start_date: string; end_date: string } | null;
  const untouched = prev ? UNTOUCHED : "";

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
    return { error: "Erreur lors de la sauvegarde de la road map." + untouched };
  }

  const roadmapId = (roadmap as { id: string }).id;

  const restoreDates = async () => {
    if (!prev) {
      // Première sauvegarde ratée : on retire la road map tout juste créée
      // plutôt que de laisser une coquille sans phases, qui s'afficherait
      // ensuite comme une road map existante mais vide.
      const { error } = await supabase.from("roadmaps").delete().eq("id", roadmapId);
      if (error) console.error("applyRoadmapForClient cleanup new roadmap error:", error);
      return;
    }
    const { error } = await supabase
      .from("roadmaps")
      .update({ start_date: prev.start_date, end_date: prev.end_date })
      .eq("id", prev.id);
    if (error) console.error("applyRoadmapForClient restore dates error:", error);
  };
  const removeIds = async (table: "roadmap_phases" | "roadmap_objectives", ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await supabase.from(table).delete().in("id", ids);
    if (error) console.error(`applyRoadmapForClient cleanup ${table} error:`, error);
  };

  // 2. Ids existants, pour ne supprimer QUE l'ancienne version à la fin.
  const [oldPhasesRes, oldObjectivesRes] = await Promise.all([
    supabase.from("roadmap_phases").select("id").eq("roadmap_id", roadmapId),
    supabase.from("roadmap_objectives").select("id").eq("roadmap_id", roadmapId),
  ]);
  if (oldPhasesRes.error || oldObjectivesRes.error) {
    console.error("applyRoadmapForClient snapshot error:", oldPhasesRes.error ?? oldObjectivesRes.error);
    await restoreDates();
    return { error: "Erreur lors de la lecture des phases actuelles." + untouched };
  }
  const oldPhaseIds = ((oldPhasesRes.data ?? []) as { id: string }[]).map((r) => r.id);
  const oldObjectiveIds = ((oldObjectivesRes.data ?? []) as { id: string }[]).map((r) => r.id);

  // 3. Nouvelles lignes d'abord.
  let newPhaseIds: string[] = [];
  if (input.phases.length > 0) {
    const { data, error } = await supabase
      .from("roadmap_phases")
      .insert(input.phases.map((p, i) => phaseRow(p, roadmapId, i)))
      .select("id");
    if (error) {
      console.error("applyRoadmapForClient insert phases error:", error);
      await restoreDates();
      return { error: "Erreur lors de l'ajout des phases." + untouched };
    }
    newPhaseIds = ((data ?? []) as { id: string }[]).map((r) => r.id);
  }

  let newObjectiveIds: string[] = [];
  if (input.objectives.length > 0) {
    const { data, error } = await supabase
      .from("roadmap_objectives")
      .insert(input.objectives.map((o) => objectiveRow(o, roadmapId)))
      .select("id");
    if (error) {
      console.error("applyRoadmapForClient insert objectives error:", error);
      await removeIds("roadmap_phases", newPhaseIds);
      await restoreDates();
      return { error: "Erreur lors de l'ajout des objectifs." + untouched };
    }
    newObjectiveIds = ((data ?? []) as { id: string }[]).map((r) => r.id);
  }

  // 4. Tout est inséré : on retire l'ancienne version.
  if (oldPhaseIds.length > 0) {
    const { error } = await supabase.from("roadmap_phases").delete().in("id", oldPhaseIds);
    if (error) {
      console.error("applyRoadmapForClient delete old phases error:", error);
      await removeIds("roadmap_phases", newPhaseIds);
      await removeIds("roadmap_objectives", newObjectiveIds);
      await restoreDates();
      return { error: "Erreur lors du remplacement des phases." + untouched };
    }
  }
  if (oldObjectiveIds.length > 0) {
    const { error } = await supabase.from("roadmap_objectives").delete().in("id", oldObjectiveIds);
    if (error) {
      // Les phases sont déjà remplacées : on garde les anciens objectifs
      // (retrait des nouveaux) plutôt que de les avoir en double.
      console.error("applyRoadmapForClient delete old objectives error:", error);
      await removeIds("roadmap_objectives", newObjectiveIds);
      return { error: "Phases enregistrées, mais les objectifs n'ont pas pu être mis à jour. Réessaie." };
    }
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
