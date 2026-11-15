// Retour volontaire des membres sur l'appli (chantier C78, 2026-11-15).
// But : savoir ce qui sert vraiment pendant le test gratuit et ce qui
// bloque, sans collecte excessive. Trois questions, une fois tous les
// 60 jours au plus, jamais avant 3 jours d'usage, toujours ignorable.
// Aucune donnée de santé demandée (rappel sous le champ libre).
//
// Fichier pur, client et serveur.

export const FEEDBACK_MIN_DAYS = 3;
export const FEEDBACK_EVERY_DAYS = 60;

export const MOST_USEFUL_CHOICES = [
  { id: "programme", label: "Mon programme" },
  { id: "seance", label: "La séance et le logbook" },
  { id: "nutrition", label: "La nutrition" },
  { id: "suivi", label: "Le suivi (poids, bilan, pas)" },
  { id: "guides", label: "Les guides" },
  { id: "rien_encore", label: "Rien encore" },
] as const;

export type MostUsefulId = (typeof MOST_USEFUL_CHOICES)[number]["id"];

export function isMostUseful(v: unknown): v is MostUsefulId {
  return typeof v === "string" && MOST_USEFUL_CHOICES.some((c) => c.id === v);
}

const DAY = 86_400_000;

/** Demander l'avis ? Après 3 jours d'usage, puis au plus une fois tous les 60 jours. */
export function shouldAskFeedback(accountCreatedAt: string | null | undefined, lastFeedbackAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!accountCreatedAt) return false;
  const created = Date.parse(accountCreatedAt);
  if (!Number.isFinite(created) || now.getTime() - created < FEEDBACK_MIN_DAYS * DAY) return false;
  if (!lastFeedbackAt) return true;
  const last = Date.parse(lastFeedbackAt);
  return !Number.isFinite(last) || now.getTime() - last >= FEEDBACK_EVERY_DAYS * DAY;
}

export interface FeedbackInput {
  usefulness: unknown;
  mostUseful: unknown;
  missing: unknown;
}

export interface CleanFeedback {
  usefulness: number;
  most_useful: MostUsefulId | null;
  missing: string | null;
}

export function cleanFeedback(input: FeedbackInput): CleanFeedback | null {
  const u = Number(input.usefulness);
  if (!Number.isInteger(u) || u < 1 || u > 5) return null;
  const missing = typeof input.missing === "string" ? input.missing.trim().slice(0, 500) : "";
  return { usefulness: u, most_useful: isMostUseful(input.mostUseful) ? input.mostUseful : null, missing: missing || null };
}

export interface FeedbackRow {
  usefulness: number;
  most_useful: string | null;
  missing: string | null;
  access_type: string | null;
  created_at: string;
}

export interface FeedbackSummary {
  count: number;
  /** Moyenne d'utilité sur 5, une décimale ; null sans réponse. */
  average: number | null;
  /** Ce qui sert le plus, du plus cité au moins cité. */
  mostUseful: { id: string; label: string; count: number }[];
  /** Part des réponses à 1 ou 2 sur 5. */
  lowShare: number;
}

export function summarizeFeedback(rows: FeedbackRow[]): FeedbackSummary {
  const count = rows.length;
  const average = count ? Math.round((rows.reduce((s, r) => s + r.usefulness, 0) / count) * 10) / 10 : null;
  const counts = new Map<string, number>();
  for (const r of rows) if (r.most_useful) counts.set(r.most_useful, (counts.get(r.most_useful) ?? 0) + 1);
  const mostUseful = MOST_USEFUL_CHOICES.map((c) => ({ id: c.id as string, label: c.label as string, count: counts.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const lowShare = count ? Math.round((rows.filter((r) => r.usefulness <= 2).length / count) * 100) : 0;
  return { count, average, mostUseful, lowShare };
}
