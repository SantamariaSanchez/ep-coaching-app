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

export function getWeekPerformanceColor(
  checkinExists: boolean,
  nutritionDays: number,
  sessionsDone: number,
  sessionsPlanned: number,
  isFuture: boolean
): PerformanceKey {
  if (isFuture) return "future";
  if (!checkinExists && nutritionDays === 0 && sessionsDone === 0) return "empty";

  let score = 0;
  if (checkinExists) score += 30;
  score += Math.min((nutritionDays / 7) * 40, 40);
  if (sessionsPlanned > 0) {
    score += Math.min((sessionsDone / sessionsPlanned) * 30, 30);
  } else {
    score += 30;
  }

  if (score >= 85) return "excellent";
  if (score >= 65) return "good";
  if (score >= 40) return "average";
  return "poor";
}
