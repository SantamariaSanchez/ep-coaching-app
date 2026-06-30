import { createAdminClient } from "@/lib/supabase-admin";

// Points/rang : gagnés en utilisant l'appli ou en publiant dans la
// communauté (jamais en payant). Append-only ledger, donc le même
// événement (une leçon, un bilan du jour, une séance...) n'est récompensé
// qu'une fois grâce à la contrainte unique (client_id, source_type,
// source_id) — rappeler awardPoints avec la même source est un no-op.
//
// Le rang sert à deux choses : un badge cosmétique visible sur le profil,
// ET le déblocage progressif de quelques contenus (voir FEATURE_UNLOCKS
// dans lib/gamification-types.ts) pour les membres qui n'ont pas (encore)
// pris l'abonnement. Tout ce qui demande du temps réel du coach (messages,
// bilans coachés, programme construit par le coach, retours vidéo
// personnalisés, check-in, lives, formations) reste exclusivement réservé
// à l'abonnement payant, quel que soit le rang — ça ne scale pas de donner
// du temps de coaching gratuit.

export type {
  RankDef,
  UnlockableFeature,
} from "@/lib/gamification-types";
export {
  RANKS,
  getRankForPoints,
  FEATURE_UNLOCK_POINTS,
  hasUnlocked,
  LEGEND_RANK_KEY,
  isEligibleForLegendReward,
} from "@/lib/gamification-types";

export const POINTS = {
  formation_lesson: 15,
  daily_bilan: 10,
  nutrition_log_day: 8,
  session_complete: 20,
  community_question: 5,
  community_victory: 10,
} as const;

export async function awardPoints(
  clientId: string,
  points: number,
  reason: string,
  sourceType: string,
  sourceId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("gamification_points").insert({
      client_id: clientId,
      points,
      reason,
      source_type: sourceType,
      source_id: sourceId,
    });
    // Errors (including the expected unique-constraint conflict on repeat
    // events) are swallowed on purpose — this must never block the calling
    // action, and "already awarded" is a perfectly normal outcome here.
  } catch {
    // best-effort
  }
}

export async function getTotalPoints(clientId: string): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("gamification_points")
      .select("points")
      .eq("client_id", clientId);
    return (data ?? []).reduce((sum, r) => sum + (r.points as number), 0);
  } catch {
    return 0;
  }
}

// Version batch — pour afficher un badge de rang à côté de plusieurs auteurs
// d'un coup (fil Communauté) sans une requête par auteur.
export async function getPointsMap(clientIds: string[]): Promise<Record<string, number>> {
  if (clientIds.length === 0) return {};
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("gamification_points")
      .select("client_id, points")
      .in("client_id", clientIds);
    const map: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = row.client_id as string;
      map[id] = (map[id] ?? 0) + (row.points as number);
    }
    return map;
  } catch {
    return {};
  }
}
