export const PHASE_COLORS = {
  masse: {
    bg: "rgba(251, 146, 60, 0.15)",
    border: "rgba(251, 146, 60, 0.4)",
    solid: "#fb923c",
    label: "Prise de masse",
    icon: "📈",
  },
  deficit: {
    bg: "rgba(224, 30, 30, 0.15)",
    border: "rgba(224, 30, 30, 0.4)",
    solid: "#E01E1E",
    label: "Déficit / Sèche",
    icon: "🔥",
  },
  maintenance: {
    bg: "rgba(148, 163, 184, 0.12)",
    border: "rgba(148, 163, 184, 0.3)",
    solid: "#94a3b8",
    label: "Maintenance",
    icon: "⚖️",
  },
  refeed: {
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.3)",
    solid: "#22c55e",
    label: "Refeed",
    icon: "⚡",
  },
  deload: {
    bg: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.3)",
    solid: "#8b5cf6",
    label: "Deload",
    icon: "🔄",
  },
  devolume: {
    bg: "rgba(99, 102, 241, 0.12)",
    border: "rgba(99, 102, 241, 0.3)",
    solid: "#6366f1",
    label: "Dé-volume",
    icon: "📉",
  },
  diet_break: {
    bg: "rgba(20, 184, 166, 0.12)",
    border: "rgba(20, 184, 166, 0.3)",
    solid: "#14b8a6",
    label: "Diet Break",
    icon: "🧘",
  },
  competition: {
    bg: "rgba(234, 179, 8, 0.15)",
    border: "rgba(234, 179, 8, 0.5)",
    solid: "#eab308",
    label: "Compétition",
    icon: "🏆",
  },
  peak_week: {
    bg: "rgba(234, 179, 8, 0.25)",
    border: "rgba(234, 179, 8, 0.7)",
    solid: "#f59e0b",
    label: "Peak Week",
    icon: "💎",
  },
  custom: {
    bg: "rgba(253, 196, 196, 0.1)",
    border: "rgba(253, 196, 196, 0.25)",
    solid: "#FDC4C4",
    label: "Personnalisé",
    icon: "📌",
  },
} as const;

export type PhaseType = keyof typeof PHASE_COLORS;

export const WEEK_PERFORMANCE_COLORS = {
  excellent: { bg: "rgba(34, 197, 94, 0.85)", label: "Excellente semaine" },
  good:      { bg: "rgba(34, 197, 94, 0.45)", label: "Bonne semaine" },
  average:   { bg: "rgba(251, 146, 60, 0.6)",  label: "Semaine moyenne" },
  poor:      { bg: "rgba(224, 30, 30, 0.6)",   label: "Semaine difficile" },
  empty:     { bg: "rgba(245, 237, 237, 0.06)", label: "Aucune donnée" },
  future:    { bg: "rgba(245, 237, 237, 0.03)", label: "À venir" },
} as const;

export type PerformanceKey = keyof typeof WEEK_PERFORMANCE_COLORS;

export const OBJECTIVE_TERM_COLORS = {
  short:  "#22c55e",
  medium: "#fb923c",
  long:   "#eab308",
} as const;

// Couleur d'une semaine du calendrier de road map (lib/roadmap-stats.ts).
//
// Refonte 2026-09-28 : 30 points reposaient uniquement sur check_ins, une
// table vide depuis toujours (aucun écran de check-in côté coach "Moi"), donc
// chaque semaine plafonnait à "Bonne semaine" quoi qu'il arrive. Et "séances
// prévues" comptait les séances DÉMARRÉES : 2 faites sur 2 démarrées donnait
// un sans-faute même avec 5 séances au programme. Désormais :
//   suivi 30 pts        : bilans quotidiens (daily_logs), ou un check-in hebdo
//   nutrition 40 pts    : jours avec au moins un aliment logué
//   entraînement 30 pts : séances terminées vs fréquence du programme
// Les bilans et la nutrition visent 5 jours sur 7 (au prorata des jours déjà
// écoulés pour la semaine en cours), les séances visent le plan au prorata.
export interface WeekScoreInput {
  checkinExists: boolean;
  bilanDays: number;
  nutritionDays: number;
  sessionsDone: number;
  /** Séances prévues sur une semaine pleine, null si aucun plan connu. */
  sessionsPlanned: number | null;
  /** Jours écoulés de la semaine (7 pour une semaine passée). */
  daysElapsed: number;
  isFuture: boolean;
}

export const WEEK_SCORE_LEGEND =
  "Couleur de la semaine : bilans quotidiens (30 pts), jours de nutrition logués (40 pts), séances faites vs programme (30 pts).";

export function getWeekPerformanceColor(input: WeekScoreInput): PerformanceKey {
  const { checkinExists, bilanDays, nutritionDays, sessionsDone, sessionsPlanned, isFuture } = input;
  if (isFuture) return "future";
  if (!checkinExists && bilanDays === 0 && nutritionDays === 0 && sessionsDone === 0) return "empty";

  const days = Math.min(7, Math.max(1, input.daysElapsed));
  const dailyTarget = Math.min(5, days);

  const suivi = Math.max(checkinExists ? 30 : 0, Math.min(bilanDays / dailyTarget, 1) * 30);
  const nutrition = Math.min(nutritionDays / dailyTarget, 1) * 40;
  const training =
    sessionsPlanned && sessionsPlanned > 0
      ? Math.min(sessionsDone / ((sessionsPlanned * days) / 7), 1) * 30
      : 30;

  const score = suivi + nutrition + training;
  if (score >= 85) return "excellent";
  if (score >= 65) return "good";
  if (score >= 40) return "average";
  return "poor";
}
