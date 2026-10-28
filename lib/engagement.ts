// Engagement d'un client coaché : 6 mois par défaut (modifiable par le coach),
// date de début et de fin, progression « mois X sur 6 » côté client, appel
// bilan un mois avant la fin et parcours de renouvellement.
//
// Module PUR (aucun import serveur), dates en chaînes YYYY-MM-DD manipulées
// en UTC (lib/roadmap-weeks.ts), jamais de new Date(iso) en heure locale.
//
// Statut des règles : décisions produit d'Emmanuel (le Mastermind ne fixe
// aucune durée de phase ni d'engagement, c'est une pratique de l'offre).
//   - Durée type de l'engagement : 6 mois.
//   - Appel bilan : 1 mois avant la fin de l'engagement.
//   - Phases : calibrage 2 à 3 semaines, puis blocs d'optimisation d'environ
//     5 semaines, et un dernier bloc court de bilan et de suite. Le
//     Mastermind enseigne qu'aucun modèle de périodisation n'est « le
//     meilleur » : ces durées sont des repères de planification, le coach
//     les ajuste librement par client.

import { addDaysIso, diffDaysIso, isValidIsoDate, isoToUtcMs, utcMsToIso } from "@/lib/roadmap-weeks";

export const DEFAULT_ENGAGEMENT_MONTHS = 6;
export const MIN_ENGAGEMENT_MONTHS = 1;
export const MAX_ENGAGEMENT_MONTHS = 24;
/** L'appel bilan se déclenche un mois avant la fin de l'engagement. */
export const REVIEW_LEAD_MONTHS = 1;

export type RenewalStatus = "en_reflexion" | "renouvele" | "arrete";

export interface EngagementRow {
  client_id: string;
  duration_months: number;
  start_date: string;
  end_date: string;
  review_notified_at: string | null;
  renewal_status: RenewalStatus | null;
  note: string | null;
}

/** Ajoute n mois à une date, en restant sur le dernier jour du mois si besoin (31 janvier + 1 mois = 28/29 février). */
export function addMonthsIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = m - 1 + n;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return utcMsToIso(Date.UTC(ny, nm, Math.min(d, lastDay)));
}

/** Dernier jour inclus d'un engagement : début + durée, moins un jour. */
export function engagementEndDate(startDate: string, months: number): string {
  return addDaysIso(addMonthsIso(startDate, months), -1);
}

export function clampEngagementMonths(months: number): number {
  if (!Number.isFinite(months)) return DEFAULT_ENGAGEMENT_MONTHS;
  return Math.min(MAX_ENGAGEMENT_MONTHS, Math.max(MIN_ENGAGEMENT_MONTHS, Math.round(months)));
}

/** Date de l'appel bilan : un mois avant la fin (fin exclusive, comme addMonths). */
export function reviewDate(endDate: string): string {
  return addMonthsIso(addDaysIso(endDate, 1), -REVIEW_LEAD_MONTHS);
}

export interface EngagementProgress {
  status: "before" | "active" | "ended";
  months: number;
  /** Mois en cours, de 1 à `months` (plafonné). */
  monthIndex: number;
  weekIndex: number;
  totalWeeks: number;
  daysLeft: number;
  /** 0 à 100. */
  pct: number;
}

export function engagementProgress(startDate: string, endDate: string, today: string): EngagementProgress {
  const totalDays = Math.max(1, diffDaysIso(startDate, endDate) + 1);
  const totalWeeks = Math.ceil(totalDays / 7);
  // Durée en mois lue sur les dates : le nombre de mois entiers contenus.
  let months = 0;
  while (months < MAX_ENGAGEMENT_MONTHS && addDaysIso(addMonthsIso(startDate, months + 1), -1) <= endDate) months++;
  months = Math.max(1, months);
  if (today < startDate) {
    return { status: "before", months, monthIndex: 1, weekIndex: 1, totalWeeks, daysLeft: diffDaysIso(today, endDate) + 1, pct: 0 };
  }
  const elapsed = diffDaysIso(startDate, today);
  if (today > endDate) {
    return { status: "ended", months, monthIndex: months, weekIndex: totalWeeks, totalWeeks, daysLeft: 0, pct: 100 };
  }
  let monthIndex = 1;
  while (monthIndex < months && addMonthsIso(startDate, monthIndex) <= today) monthIndex++;
  return {
    status: "active",
    months,
    monthIndex,
    weekIndex: Math.min(totalWeeks, Math.floor(elapsed / 7) + 1),
    totalWeeks,
    daysLeft: diffDaysIso(today, endDate) + 1,
    pct: Math.min(100, Math.round(((elapsed + 1) / totalDays) * 100)),
  };
}

export type ReviewState = "none" | "upcoming" | "due" | "late";

/**
 * Où en est l'appel bilan.
 *  - none : le bilan n'est pas encore à l'ordre du jour
 *  - upcoming : dans les 7 jours qui précèdent la date du bilan
 *  - due : la date du bilan est passée, l'engagement n'est pas fini
 *  - late : l'engagement est fini sans décision de suite
 */
export function reviewState(endDate: string, today: string, renewal: RenewalStatus | null): ReviewState {
  if (renewal === "renouvele" || renewal === "arrete") return "none";
  if (today > endDate) return "late";
  const due = reviewDate(endDate);
  if (today >= due) return "due";
  if (diffDaysIso(today, due) <= 7) return "upcoming";
  return "none";
}

// ── Plan de phases aligné sur l'engagement ───────────────────────────────────

export const CALIBRATION_WEEKS = 3;
export const OPTIMISATION_BLOCK_WEEKS = 5;
export const CLOSING_WEEKS = 4;

export interface PlannedBlock {
  kind: "calibrage" | "optimisation" | "bilan";
  weeks: number;
  /** Semaine de début dans l'engagement, à partir de 1. */
  startWeek: number;
}

/** Répartit `total` semaines en `n` blocs aussi égaux que possible, les plus longs d'abord. */
function splitEvenly(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const extra = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * Plan de référence : calibrage de 3 semaines, blocs d'optimisation d'environ
 * 5 semaines, puis 4 semaines de bilan et de suite. Pour 6 mois (26 semaines) :
 * 3 + 5 + 5 + 5 + 4 + 4 (bilan). Un engagement trop court n'a pas de bloc de
 * bilan séparé.
 */
export function planEngagementBlocks(months: number): PlannedBlock[] {
  const totalWeeks = Math.round((clampEngagementMonths(months) * 52) / 12);
  const blocks: PlannedBlock[] = [];
  let cursor = 1;
  const push = (kind: PlannedBlock["kind"], weeks: number) => {
    if (weeks <= 0) return;
    blocks.push({ kind, weeks, startWeek: cursor });
    cursor += weeks;
  };
  const calibration = Math.min(CALIBRATION_WEEKS, Math.max(1, totalWeeks - 1));
  push("calibrage", calibration);
  const closing = totalWeeks - calibration >= CLOSING_WEEKS + OPTIMISATION_BLOCK_WEEKS ? CLOSING_WEEKS : 0;
  const optimisationTotal = totalWeeks - calibration - closing;
  if (optimisationTotal > 0) {
    const n = Math.max(1, Math.round(optimisationTotal / OPTIMISATION_BLOCK_WEEKS));
    for (const w of splitEvenly(optimisationTotal, n)) push("optimisation", w);
  }
  push("bilan", closing);
  return blocks;
}

// ── Message de renouvellement (modèle prêt à envoyer, tutoiement) ───────────

export type RenewalMessageKind = "un_mois" | "fin";

/**
 * Modèle de message pour proposer le bilan puis la suite. Le coach relit et
 * modifie avant d'envoyer : rien ne part tout seul. Aucune promesse de
 * résultat, aucun chiffre inventé.
 */
export function renewalMessage(opts: { firstName: string | null; kind: RenewalMessageKind; endDate: string; bookingUrl?: string }): string {
  const name = opts.firstName?.trim() ? opts.firstName.trim() : "";
  const hello = name ? `Salut ${name},` : "Salut,";
  const end = frenchDate(opts.endDate);
  const link = opts.bookingUrl ? `\n\nTu peux réserver ce créneau ici : ${opts.bookingUrl}` : "";
  if (opts.kind === "un_mois") {
    return `${hello}\n\nIl reste environ un mois à ton accompagnement, il se termine le ${end}. Je te propose un appel bilan pour faire le point ensemble : ce qui a marché, ce qui t'a demandé le plus d'efforts, et ce que tu veux pour la suite.\n\nÀ la fin de l'appel, on décide ensemble de la suite : continuer sur la même base, changer d'objectif ou faire une pause. Tu n'as rien à préparer, juste venir avec ton ressenti.${link}`;
  }
  return `${hello}\n\nTon accompagnement se termine le ${end}. Merci pour le travail fourni pendant ces mois. Si tu veux continuer, je te propose de repartir sur un nouvel objectif et de refaire le point sur ton plan. Si tu préfères faire une pause, aucun souci : tout ton suivi reste disponible.\n\nDis-moi ce que tu préfères et on organise la suite.\n\nEt si ton parcours t'a plu, tu connais peut-être quelqu'un qui aimerait être accompagné de la même façon : une recommandation de ta part m'aiderait beaucoup, sans aucune obligation.${link}`;
}

function frenchDate(iso: string): string {
  if (!isValidIsoDate(iso)) return iso;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(isoToUtcMs(iso)));
}
