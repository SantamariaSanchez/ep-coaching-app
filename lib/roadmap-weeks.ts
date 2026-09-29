// Dates "calendrier" de la road map, sur des chaînes YYYY-MM-DD.
//
// Avant (audit 2026-09-28), le calendrier construisait ses semaines en heure
// LOCALE (toISO sur getFullYear/getMonth/getDate) tandis que lib/roadmap-stats.ts
// construisait les siennes en UTC (toISOString) : dès qu'une road map
// commençait en heure d'hiver, les clés de semaine des deux côtés divergeaient
// d'un jour après le passage à l'heure d'été, et toutes les semaines d'été
// perdaient leurs stats et leur numéro "S". Tout passe maintenant par ces
// helpers en Date.UTC / getUTC* : une date calendaire n'a pas de fuseau, donc
// aucun changement d'heure ne peut plus la décaler.
//
// Module pur (aucun import serveur) : utilisable côté client comme serveur.

const DAY_MS = 86_400_000;

// Garde-fou : au-delà de 10 ans, c'est presque toujours une année mal tapée
// (un champ date émet "0002-05-01" pendant la saisie de l'année). Sans borne,
// le calendrier générait des dizaines de milliers de semaines et figeait la page.
export const MAX_ROADMAP_WEEKS = 520;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function isValidIsoDate(iso: string | null | undefined): iso is string {
  if (!iso) return false;
  const m = ISO_RE.exec(iso);
  if (!m) return false;
  const y = Number(m[1]);
  // Date.UTC interprète les années 0 à 99 comme 1900 à 1999 : on les écarte.
  if (y < 1900 || y > 2200) return false;
  return utcMsToIso(isoToUtcMs(iso)) === iso;
}

export function isoToUtcMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function utcMsToIso(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDaysIso(iso: string, n: number): string {
  return utcMsToIso(isoToUtcMs(iso) + n * DAY_MS);
}

/** Nombre de jours de `from` à `to` (positif si `to` est après `from`). */
export function diffDaysIso(from: string, to: string): number {
  return Math.round((isoToUtcMs(to) - isoToUtcMs(from)) / DAY_MS);
}

/** 1 = lundi ... 7 = dimanche. */
export function isoDayOfWeek(iso: string): number {
  return new Date(isoToUtcMs(iso)).getUTCDay() || 7;
}

export function mondayOfIso(iso: string): string {
  return addDaysIso(iso, 1 - isoDayOfWeek(iso));
}

export function minIso(a: string, b: string): string {
  return a <= b ? a : b;
}

export function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}

export interface RoadmapWeek {
  weekStart: string;
  weekEnd: string;
  /** Numéro de semaine de la road map, 1 pour la semaine du début. */
  index: number;
  /** Mois (0 à 11) et année du lundi, pour regrouper le calendrier par mois. */
  month: number;
  year: number;
}

/** Nombre de semaines (lundi à dimanche) couvertes par la période, 0 si invalide. */
export function countRoadmapWeeks(start: string, end: string): number {
  if (!isValidIsoDate(start) || !isValidIsoDate(end) || end < start) return 0;
  return Math.floor(diffDaysIso(mondayOfIso(start), mondayOfIso(end)) / 7) + 1;
}

/**
 * Toutes les semaines de la road map, du lundi de la semaine de début au
 * lundi de la semaine de fin. Tableau vide si les dates sont invalides ou si
 * la période dépasse MAX_ROADMAP_WEEKS.
 */
export function buildRoadmapWeeks(start: string, end: string): RoadmapWeek[] {
  const count = countRoadmapWeeks(start, end);
  if (count === 0 || count > MAX_ROADMAP_WEEKS) return [];
  const first = mondayOfIso(start);
  const weeks: RoadmapWeek[] = [];
  for (let i = 0; i < count; i++) {
    const weekStart = addDaysIso(first, i * 7);
    const d = new Date(isoToUtcMs(weekStart));
    weeks.push({
      weekStart,
      weekEnd: addDaysIso(weekStart, 6),
      index: i + 1,
      month: d.getUTCMonth(),
      year: d.getUTCFullYear(),
    });
  }
  return weeks;
}

/**
 * Numéro de la semaine de la road map qui contient `date`, avec la même
 * numérotation que le calendrier (S1 = semaine du début). Peut être < 1 avant
 * le début ou dépasser le total après la fin : à l'appelant de trancher.
 */
export function roadmapWeekIndex(start: string, date: string): number {
  return Math.floor(diffDaysIso(mondayOfIso(start), mondayOfIso(date)) / 7) + 1;
}

/**
 * Formate une date calendaire en français. Midi UTC + timeZone UTC : le jour
 * affiché est toujours celui de la chaîne, quel que soit le fuseau du
 * navigateur ou du serveur.
 */
export function formatIsoFr(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone: "UTC" }).format(
    new Date(isoToUtcMs(iso) + 12 * 3_600_000)
  );
}
