import { createAdminClient } from "@/lib/supabase-admin";

// Purely cosmetic points/rank system — visible on a member's profile, no
// functional advantage anywhere. Points are an append-only ledger so the
// same event (one lesson, one day's bilan, one session...) can only ever
// be rewarded once, thanks to the unique (client_id, source_type, source_id)
// constraint — calling awardPoints again with the same source is a no-op.

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

export interface RankDef {
  key: string;
  label: string;
  minPoints: number;
  emoji: string;
}

export const RANKS: RankDef[] = [
  { key: "debutant", label: "Débutant", minPoints: 0, emoji: "🌱" },
  { key: "espoir", label: "Espoir", minPoints: 100, emoji: "💪" },
  { key: "confirme", label: "Confirmé", minPoints: 300, emoji: "🔥" },
  { key: "veteran", label: "Vétéran", minPoints: 700, emoji: "⚡" },
  { key: "elite", label: "Élite", minPoints: 1500, emoji: "🏆" },
  { key: "champion", label: "Champion", minPoints: 3000, emoji: "👑" },
  { key: "legende", label: "Légende", minPoints: 6000, emoji: "🐐" },
];

export function getRankForPoints(points: number): {
  rank: RankDef;
  next: RankDef | null;
  progressPct: number;
} {
  let current = RANKS[0];
  let next: RankDef | null = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (points >= RANKS[i].minPoints) {
      current = RANKS[i];
      next = RANKS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.round(((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100)
    : 100;
  return { rank: current, next, progressPct };
}
