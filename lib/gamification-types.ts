// Logique pure (rangs, seuils de déblocage) — séparée de lib/gamification.ts
// pour rester importable depuis des composants client sans entraîner
// lib/supabase-admin dans le bundle navigateur (même principe que
// utils/science-types.ts).

export interface RankDef {
  key: string;
  label: string;
  minPoints: number;
  emoji: string;
  /** Ce que ce rang débloque, en plus du précédent — affiché sur le profil / l'abonnement. */
  unlocks?: string[];
  /** Récompense réelle (hors-appli), remise manuellement par le coach. */
  reward?: string;
}

// Seuils volontairement lents — c'est une récompense de fidélité sur la
// durée, pas un raccourci. À un rythme engagé (bilan + nutrition loggés
// quasi tous les jours, 3-4 séances/semaine, quelques posts), compter very
// grossièrement plusieurs mois entre chaque palier à partir de "Confirmé".
export const RANKS: RankDef[] = [
  { key: "debutant", label: "Débutant", minPoints: 0, emoji: "🌱" },
  {
    key: "espoir",
    label: "Espoir",
    minPoints: 250,
    emoji: "💪",
    unlocks: ["Recettes exclusives"],
  },
  {
    key: "confirme",
    label: "Confirmé",
    minPoints: 800,
    emoji: "🔥",
    unlocks: ["Vidéos de démonstration des exercices"],
  },
  {
    key: "veteran",
    label: "Vétéran",
    minPoints: 2000,
    emoji: "⚡",
    unlocks: ["Participer à \"Nos études\""],
  },
  { key: "elite", label: "Élite", minPoints: 4500, emoji: "🏆" },
  { key: "champion", label: "Champion", minPoints: 9000, emoji: "👑" },
  {
    key: "legende",
    label: "Légende",
    minPoints: 18000,
    emoji: "🐐",
    reward: "Bague Oura offerte par ton coach (membres abonnés)",
  },
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

// ── Déblocage de fonctionnalités par points (alternative à l'abonnement) ──

export const FEATURE_UNLOCK_POINTS = {
  exclusive_recipes: 250,
  exercise_videos: 800,
  study_participation: 2000,
} as const;

export type UnlockableFeature = keyof typeof FEATURE_UNLOCK_POINTS;

/** Un membre abonné a toujours tout — sinon, il faut avoir atteint le seuil de points. */
export function hasUnlocked(feature: UnlockableFeature, points: number, isSubscribed: boolean): boolean {
  if (isSubscribed) return true;
  return points >= FEATURE_UNLOCK_POINTS[feature];
}

// Barème de points — dupliqué ici (plutôt que dans lib/gamification.ts) pour
// rester importable depuis des composants client sans entraîner
// lib/supabase-admin dans le bundle navigateur (même principe que le reste
// de ce fichier).
export const POINTS = {
  formation_lesson: 15,
  daily_bilan: 10,
  nutrition_log_day: 8,
  session_complete: 20,
  community_question: 5,
  community_victory: 10,
  weekly_checkin: 25,
  // Item 41 : récompense au parrain quand la personne invitée termine son
  // inscription — équivalent à 2 bilans hebdo, geste concret sans
  // déséquilibrer le reste du barème.
  referral: 50,
} as const;

export const LEGEND_RANK_KEY = "legende";

/** Éligible à la récompense réelle (Oura Ring) : abonné + rang Légende atteint. */
export function isEligibleForLegendReward(points: number, isSubscribed: boolean): boolean {
  if (!isSubscribed) return false;
  const legend = RANKS.find((r) => r.key === LEGEND_RANK_KEY);
  return legend ? points >= legend.minPoints : false;
}
