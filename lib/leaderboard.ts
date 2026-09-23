import { createAdminClient } from "@/lib/supabase-admin";
import { resolveAvatarUrls } from "@/utils/avatar";

// Classement communautaire — agrège gamification_points (déjà écrit par
// awardPoints, voir lib/gamification.ts) en une liste triée, plutôt qu'une
// nouvelle table. Mur partagé entre coachs par conception, comme le reste de
// la Communauté (voir utils/community.ts, getOpenQuestionsCount) : pas de
// filtre coach_id, membres gratuits et clients accompagnés de tous les
// coachs de la plateforme s'y retrouvent ensemble.
//
// Les points sont déjà une info publique dans l'appli (badge de rang affiché
// sur le profil d'un autre membre, byline des posts communauté) — ce fichier
// ne fait qu'agréger ce qui est déjà montré ailleurs, avec le client admin
// (RLS sur gamification_points restreint la lecture à soi-même/son coach,
// voir 20260804_security_rls_hardening.sql) comme getPointsMap/getTotalPoints.

export interface LeaderboardEntry {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
  position: number;
}

export interface LeaderboardResult {
  top: LeaderboardEntry[];
  // Position réelle de l'appelant, même hors du top affiché. null tant
  // qu'aucun point n'a été gagné (rien à classer) — l'appelant n'a alors
  // encore rien fait de réel dans l'appli.
  me: LeaderboardEntry | null;
}

const LEADERBOARD_LIMIT = 50;

export async function getLeaderboard(currentUserId: string): Promise<LeaderboardResult> {
  try {
    const admin = createAdminClient();
    const [{ data: profiles }, { data: pointsRows }] = await Promise.all([
      admin.from("profiles").select("id, full_name, avatar_url").eq("role", "client"),
      admin.from("gamification_points").select("client_id, points"),
    ]);

    const pointsMap: Record<string, number> = {};
    for (const row of pointsRows ?? []) {
      const id = row.client_id as string;
      pointsMap[id] = (pointsMap[id] ?? 0) + (row.points as number);
    }

    const ranked = (profiles ?? [])
      .map((p) => ({
        id: p.id as string,
        full_name: p.full_name as string | null,
        avatar_url: p.avatar_url as string | null,
        points: pointsMap[p.id as string] ?? 0,
      }))
      // Personne n'ayant jamais rien loggé/publié ne dit rien d'un classement
      // — les exclure évite une liste noyée de dizaines d'entrées à 0 pt.
      .filter((p) => p.points > 0)
      .sort((a, b) => b.points - a.points);

    const topSlice = ranked.slice(0, LEADERBOARD_LIMIT);
    const myIndex = ranked.findIndex((p) => p.id === currentUserId);
    const needsMyAvatar = myIndex >= LEADERBOARD_LIMIT;

    const avatarMap = await resolveAvatarUrls(
      needsMyAvatar ? [...topSlice, ranked[myIndex]] : topSlice
    );

    const top: LeaderboardEntry[] = topSlice.map((p, i) => ({
      ...p,
      avatar_url: avatarMap[p.id] ?? null,
      position: i + 1,
    }));

    let me: LeaderboardEntry | null = null;
    if (myIndex !== -1) {
      me =
        myIndex < LEADERBOARD_LIMIT
          ? top[myIndex]
          : { ...ranked[myIndex], avatar_url: avatarMap[ranked[myIndex].id] ?? null, position: myIndex + 1 };
    }

    return { top, me };
  } catch {
    return { top: [], me: null };
  }
}
