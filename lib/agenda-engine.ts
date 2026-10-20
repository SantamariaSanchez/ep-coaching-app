// Moteur de l'agenda (2026-10-20) : calculs purs, sans import serveur,
// utilisables par la grille (WeeklyAgenda), le générateur « Construire ma
// semaine », les journées types et les server actions.
//
// Repères de temps :
//  - un bloc est stocké en jour calendaire (day_of_week 1..7) + heures
//    "HH:MM:SS" (fin "24:00:00" acceptée par Postgres pour finir à minuit) ;
//  - l'affichage raisonne en « colonnes » : la journée de la personne, de son
//    heure de début à son heure de fin. Une journée de nuit (20h -> 8h)
//    déborde sur le lendemain : un bloc du mardi à 2h appartient à la colonne
//    du lundi, à la minute « absolue » 26h (1560). Tout le positionnement se
//    fait en minutes absolues depuis minuit du jour de la colonne.

import { MEAL_SLOT_TIMES } from "@/lib/meal-slots";

// ── Temps ─────────────────────────────────────────────────────────────────

export function toMin(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** "HH:MM" (sans secondes), 0..1440 ; 1440 donne "24:00". */
export function hhmm(min: number): string {
  const c = Math.max(0, Math.min(1440, Math.round(min)));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
}

/** Heure lisible d'une minute absolue (26h -> "02:00"). */
export function clockLabel(absMin: number): string {
  return hhmm(((Math.round(absMin) % 1440) + 1440) % 1440);
}

export function durationLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  if (r === 0) return `${h}h`;
  return `${h}h${String(r).padStart(2, "0")}`;
}

export function snap(min: number, step = 5): number {
  return Math.round(min / step) * step;
}

export const nextDay = (d: number) => (d % 7) + 1;
export const prevDay = (d: number) => (d === 1 ? 7 : d - 1);

export const DAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const DAY_SHORT = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const DAY_KEYS = ["", "lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
export const WEEK_DAYS = [1, 2, 3, 4, 5];

// ── Fenêtre de journée (réglages) ─────────────────────────────────────────

export interface DayWindow {
  /** Minutes depuis minuit (0..1439). */
  start: number;
  /** Minutes depuis minuit (0..1440). <= start : la journée passe minuit. */
  end: number;
}

export const DEFAULT_WINDOW: DayWindow = { start: 360, end: 1320 };

export function isOvernight(w: DayWindow): boolean {
  return w.end <= w.start;
}

/** Début et fin de la journée en minutes absolues (fin > début). */
export function windowSpan(w: DayWindow): { s: number; e: number } {
  return { s: w.start, e: isOvernight(w) ? w.end + 1440 : w.end };
}

export function windowLabel(w: DayWindow): string {
  const { s, e } = windowSpan(w);
  return `${clockLabel(s)} à ${clockLabel(e)}${isOvernight(w) ? " (nuit)" : ""}`;
}

export function sanitizeWindow(start: unknown, end: unknown): DayWindow {
  const s = Number(start);
  const e = Number(end);
  const okS = Number.isFinite(s) && s >= 0 && s <= 1439 ? Math.round(s) : DEFAULT_WINDOW.start;
  let okE = Number.isFinite(e) && e >= 0 && e <= 1440 ? Math.round(e) : DEFAULT_WINDOW.end;
  if (okE === okS) okE = (okS + 16 * 60) % 1440;
  return { start: okS, end: okE };
}

// ── Blocs ─────────────────────────────────────────────────────────────────

export interface BlockLike {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string;
  icon: string | null;
  color: string;
  link_ref?: string | null;
  tasks?: string[] | null;
  notes?: string | null;
  notify?: boolean;
  specific_date?: string | null;
}

/** Bloc placé dans une colonne, en minutes absolues. */
export interface Placed<B extends BlockLike = BlockLike> {
  block: B;
  col: number;
  s: number;
  e: number;
}

export function placeBlock<B extends BlockLike>(b: B, w: DayWindow): Placed<B> {
  const t = toMin(b.start_time);
  let te = toMin(b.end_time);
  if (te <= t) te = t + 5;
  if (isOvernight(w) && t < w.end) return { block: b, col: prevDay(b.day_of_week), s: t + 1440, e: te + 1440 };
  return { block: b, col: b.day_of_week, s: t, e: te };
}

export function placeAll<B extends BlockLike>(blocks: B[], w: DayWindow): Placed<B>[] {
  return blocks.map((b) => placeBlock(b, w));
}

export function columnBlocks<B extends BlockLike>(placed: Placed<B>[], col: number): Placed<B>[] {
  return placed.filter((p) => p.col === col).sort((a, b) => a.s - b.s || a.e - b.e);
}

/** Créneau calendaire (jour + heures) d'un intervalle absolu d'une colonne. Coupé en deux s'il passe minuit. */
export function toCalendar(col: number, s: number, e: number): { day_of_week: number; start_time: string; end_time: string }[] {
  const out: { day_of_week: number; start_time: string; end_time: string }[] = [];
  let a = Math.round(s);
  let b = Math.round(e);
  let day = col;
  while (a >= 1440) {
    a -= 1440;
    b -= 1440;
    day = nextDay(day);
  }
  while (b > a) {
    const pieceEnd = Math.min(b, 1440);
    if (pieceEnd - a >= 5) out.push({ day_of_week: day, start_time: `${hhmm(a)}:00`, end_time: `${hhmm(pieceEnd)}:00` });
    if (b <= 1440) break;
    a = 0;
    b -= 1440;
    day = nextDay(day);
  }
  return out;
}

// ── Types de bloc ─────────────────────────────────────────────────────────

export type AgendaKind = "seance" | "repas" | "trajet" | "travail" | "autre";

export function blockKind(b: { icon: string | null; label: string }): AgendaKind {
  switch (b.icon) {
    case "salle":
      return "seance";
    case "repas":
      return "repas";
    case "trajet":
    case "pas":
      return "trajet";
    case "travail":
    case "etude":
      return "travail";
  }
  const l = b.label;
  if (/(trajet|steps|marche digestive)/i.test(l)) return "trajet";
  if (/(repas|d[ée]jeuner|d[îi]ner|petit[- ]?d[ée]j|collation|go[ûu]ter)/i.test(l)) return "repas";
  if (/(s[ée]ance|training|muscu|entra[îi]nement)/i.test(l)) return "seance";
  return "autre";
}

// ── Trajets / pas ─────────────────────────────────────────────────────────

export type TravelMode = "marche" | "velo" | "transports" | "voiture";

export const TRAVEL_MODES: { key: TravelMode; label: string; stepsPerMin: number }[] = [
  { key: "marche", label: "À pied", stepsPerMin: 100 },
  { key: "transports", label: "Transports", stepsPerMin: 35 },
  { key: "velo", label: "Vélo", stepsPerMin: 0 },
  { key: "voiture", label: "Voiture", stepsPerMin: 0 },
];

export function isTravelMode(v: unknown): v is TravelMode {
  return v === "marche" || v === "velo" || v === "transports" || v === "voiture";
}

export function travelModeOf(b: { icon: string | null; label: string; link_ref?: string | null }): TravelMode {
  if (isTravelMode(b.link_ref)) return b.link_ref;
  if (b.icon === "pas" || /(pied|marche|steps|\bpas\b|promenade|balade)/i.test(b.label)) return "marche";
  if (/v[ée]lo/i.test(b.label)) return "velo";
  if (/(m[ée]tro|bus|train|tram|rer|transport)/i.test(b.label)) return "transports";
  return "voiture";
}

export function travelSteps(mode: TravelMode, minutes: number): number {
  const per = TRAVEL_MODES.find((m) => m.key === mode)?.stepsPerMin ?? 0;
  return Math.round((per * Math.max(0, minutes)) / 100) * 100;
}

export function formatSteps(n: number): string {
  return n.toLocaleString("fr-FR").replace(/ | /g, " ");
}

// ── Repas ─────────────────────────────────────────────────────────────────

export const MEAL_SLOT_ORDER = ["breakfast", "morning", "lunch", "afternoon", "preworkout", "postworkout", "dinner"];

export const MEAL_SLOT_NAMES: Record<string, string> = {
  breakfast: "Petit-déjeuner",
  morning: "Collation matin",
  lunch: "Déjeuner",
  afternoon: "Collation après-midi",
  preworkout: "Pré-entraînement",
  postworkout: "Post-entraînement",
  dinner: "Dîner",
};

export function isMealSlot(v: unknown): v is string {
  return typeof v === "string" && v in MEAL_SLOT_NAMES;
}

/** Créneau de diète d'un bloc repas : son lien s'il en a un, sinon déduit du nom puis de l'heure. */
export function mealSlotOf(b: { label: string; start_time: string; link_ref?: string | null }): string {
  if (isMealSlot(b.link_ref)) return b.link_ref;
  const l = b.label;
  if (/petit[- ]?d[ée]j|breakfast/i.test(l)) return "breakfast";
  if (/pr[ée][- ]?(work|entra|training|s[ée]ance)/i.test(l)) return "preworkout";
  if (/post[- ]?(work|entra|training|s[ée]ance)/i.test(l)) return "postworkout";
  if (/d[ée]jeuner|lunch|midi/i.test(l)) return "lunch";
  if (/d[îi]ner|dinner|souper|soir/i.test(l)) return "dinner";
  const t = toMin(b.start_time);
  if (/collation|go[ûu]ter|snack/i.test(l)) return t < 14 * 60 ? "morning" : "afternoon";
  let best = "lunch";
  let bestD = Infinity;
  for (const [slot, time] of Object.entries(MEAL_SLOT_TIMES)) {
    if (slot === "preworkout" || slot === "postworkout") continue;
    const d = Math.abs(toMin(time) - t);
    if (d < bestD) {
      bestD = d;
      best = slot;
    }
  }
  return best;
}

/**
 * Heure par défaut d'un repas dans la journée de la personne : les heures
 * habituelles (journée 6h-22h) ramenées proportionnellement à sa propre
 * journée — quelqu'un de nuit (20h -> 8h) prend son « petit-déjeuner » vers
 * 21h30 et son « dîner » vers 6h30.
 */
export function defaultMealAbs(slot: string, w: DayWindow): number {
  const { s, e } = windowSpan(w);
  const base = toMin(MEAL_SLOT_TIMES[slot] ?? "12:30");
  const ratio = (e - s) / (DEFAULT_WINDOW.end - DEFAULT_WINDOW.start);
  return snap(s + (base - DEFAULT_WINDOW.start) * ratio);
}

// ── Trous ─────────────────────────────────────────────────────────────────

export interface Gap {
  s: number;
  e: number;
}

/** Créneaux libres de la journée (dans la fenêtre), en ignorant les trous de moins de `min` minutes. */
export function findGaps(intervals: { s: number; e: number }[], w: DayWindow, min = 5): Gap[] {
  const { s: ws, e: we } = windowSpan(w);
  const sorted = [...intervals].sort((a, b) => a.s - b.s);
  const gaps: Gap[] = [];
  let cursor = ws;
  for (const iv of sorted) {
    if (iv.e <= cursor) continue;
    if (iv.s > cursor) {
      const gs = cursor;
      const ge = Math.min(iv.s, we);
      if (ge - gs >= min) gaps.push({ s: gs, e: ge });
    }
    cursor = Math.max(cursor, iv.e);
    if (cursor >= we) break;
  }
  if (we - cursor >= min) gaps.push({ s: cursor, e: we });
  return gaps;
}

export function overlaps(a: { s: number; e: number }, b: { s: number; e: number }): boolean {
  return a.s < b.e && b.s < a.e;
}

// ── Réglages / préférences du générateur ──────────────────────────────────

export type WorkWhen = "matin" | "apres-midi" | "soir" | "libre";

export interface WorkItem {
  label: string;
  tasks: string[];
  /**
   * Minutes par jour pour un bloc fixe (« Tournage 1h chaque matin »,
   * « Apprentissage 1h par jour »). 0 = bloc de remplissage : il occupe tout
   * le temps qui reste, découpé en sessions.
   */
  minutes: number;
  /** Moment préféré d'un bloc fixe. */
  when: WorkWhen;
  /** Jours d'un bloc fixe (les blocs de remplissage suivent les jours de travail). */
  days: number[];
}

export const WORK_WHEN: { key: WorkWhen; label: string }[] = [
  { key: "matin", label: "Matin" },
  { key: "apres-midi", label: "Après-midi" },
  { key: "soir", label: "Soir" },
  { key: "libre", label: "Peu importe" },
];

export interface AgendaPrefs {
  sessionTime: string; // "HH:MM"
  sessionMinutes: number;
  gymTravelMinutes: number;
  gymTravelMode: TravelMode;
  mealMinutes: number;
  workDays: number[];
  work: WorkItem[];
  chunkMinutes: number;
  workTravelMinutes: number;
  workTravelMode: TravelMode;
  digestiveWalk: boolean;
  eveningReview: boolean;
  reviewMinutes: number;
  /** Pause de 10 min entre deux sessions de remplissage. */
  breaks: boolean;
  /** Réveil (vraie alarme) à l'heure de début de journée, s'il n'y en a pas déjà un. */
  wakeAlarm: boolean;
  notify: boolean;
}

const W = (label: string, tasks: string[], minutes = 0, when: WorkWhen = "libre"): WorkItem => ({ label, tasks, minutes, when, days: [1, 2, 3, 4, 5, 6, 7] });

export const WORK_SUGGESTIONS: WorkItem[] = [
  W("Montage vidéo", ["Monter un reel", "Monter la vidéo YouTube", "Faire un carrousel", "Poster sur LinkedIn"]),
  W("Tournage", ["Préparer le décor et la lumière", "Tourner 3 reels", "Tourner la vidéo YouTube"], 60, "matin"),
  W("Apprentissage", ["YouTube, formation ou livre", "Noter une idée à appliquer"], 60, "libre"),
  W("Écriture de scripts", ["Écrire 3 accroches", "Finir un script"]),
  W("Appels clients", ["Répondre aux check-ins", "Appels prévus"]),
  W("Prospection", ["Envoyer 10 messages", "Relancer les leads"]),
  W("Admin", ["Factures", "Mails"], 30, "soir"),
  W("Travail profond", []),
];

export const DEFAULT_PREFS: AgendaPrefs = {
  sessionTime: "18:00",
  sessionMinutes: 75,
  gymTravelMinutes: 15,
  gymTravelMode: "marche",
  mealMinutes: 30,
  workDays: [1, 2, 3, 4, 5],
  work: [],
  chunkMinutes: 90,
  workTravelMinutes: 0,
  workTravelMode: "transports",
  digestiveWalk: true,
  eveningReview: true,
  reviewMinutes: 30,
  breaks: true,
  wakeAlarm: true,
  notify: true,
};

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
}

function cleanText(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function sanitizePrefs(raw: unknown): AgendaPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const time = typeof r.sessionTime === "string" && /^\d{2}:\d{2}$/.test(r.sessionTime) ? r.sessionTime : DEFAULT_PREFS.sessionTime;
  const days = Array.isArray(r.workDays) ? [...new Set(r.workDays.map(Number).filter((d) => d >= 1 && d <= 7))].sort() : DEFAULT_PREFS.workDays;
  const work = Array.isArray(r.work)
    ? r.work
        .map((w) => {
          const o = (w && typeof w === "object" ? w : {}) as Record<string, unknown>;
          const when = WORK_WHEN.some((x) => x.key === o.when) ? (o.when as WorkWhen) : "libre";
          const wd = Array.isArray(o.days) ? [...new Set(o.days.map(Number).filter((d) => d >= 1 && d <= 7))].sort() : ALL_DAYS;
          return {
            label: cleanText(o.label, 80),
            tasks: Array.isArray(o.tasks) ? o.tasks.map((t) => cleanText(t, 200)).filter(Boolean).slice(0, 12) : [],
            minutes: clampInt(o.minutes, 0, 600, 0),
            when,
            days: wd.length ? wd : ALL_DAYS,
          };
        })
        .filter((w) => w.label)
        .slice(0, 10)
    : DEFAULT_PREFS.work;
  return {
    sessionTime: time,
    sessionMinutes: clampInt(r.sessionMinutes, 20, 240, DEFAULT_PREFS.sessionMinutes),
    gymTravelMinutes: clampInt(r.gymTravelMinutes, 0, 120, DEFAULT_PREFS.gymTravelMinutes),
    gymTravelMode: isTravelMode(r.gymTravelMode) ? r.gymTravelMode : DEFAULT_PREFS.gymTravelMode,
    mealMinutes: clampInt(r.mealMinutes, 10, 90, DEFAULT_PREFS.mealMinutes),
    workDays: days,
    work,
    chunkMinutes: clampInt(r.chunkMinutes, 30, 240, DEFAULT_PREFS.chunkMinutes),
    workTravelMinutes: clampInt(r.workTravelMinutes, 0, 120, DEFAULT_PREFS.workTravelMinutes),
    workTravelMode: isTravelMode(r.workTravelMode) ? r.workTravelMode : DEFAULT_PREFS.workTravelMode,
    digestiveWalk: typeof r.digestiveWalk === "boolean" ? r.digestiveWalk : DEFAULT_PREFS.digestiveWalk,
    eveningReview: typeof r.eveningReview === "boolean" ? r.eveningReview : DEFAULT_PREFS.eveningReview,
    reviewMinutes: clampInt(r.reviewMinutes, 5, 90, DEFAULT_PREFS.reviewMinutes),
    breaks: typeof r.breaks === "boolean" ? r.breaks : DEFAULT_PREFS.breaks,
    wakeAlarm: typeof r.wakeAlarm === "boolean" ? r.wakeAlarm : DEFAULT_PREFS.wakeAlarm,
    notify: typeof r.notify === "boolean" ? r.notify : DEFAULT_PREFS.notify,
  };
}

// ── Journées types ────────────────────────────────────────────────────────

/** Bloc d'une journée type, en minutes absolues de la colonne (peut dépasser 1440 pour une journée de nuit). */
export interface TemplateBlock {
  s: number;
  e: number;
  label: string;
  icon: string | null;
  color: string;
  tasks: string[];
  notes: string | null;
  notify: boolean;
  link_ref: string | null;
}

export interface DayTemplate {
  id: string;
  name: string;
  blocks: TemplateBlock[];
}

export function sanitizeTemplateBlock(raw: unknown): TemplateBlock | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s = clampInt(o.s, 0, 2880, -1);
  const e = clampInt(o.e, 0, 2880, -1);
  const label = cleanText(o.label, 200);
  if (s < 0 || e <= s || !label) return null;
  return {
    s,
    e,
    label,
    icon: typeof o.icon === "string" ? o.icon.slice(0, 30) : null,
    color: typeof o.color === "string" && o.color.length <= 40 ? o.color : "var(--ep-info)",
    tasks: Array.isArray(o.tasks) ? o.tasks.map((t) => cleanText(t, 200)).filter(Boolean).slice(0, 20) : [],
    notes: cleanText(o.notes, 2000) || null,
    notify: o.notify === true,
    link_ref: typeof o.link_ref === "string" ? o.link_ref.slice(0, 120) : null,
  };
}

export function sanitizeTemplates(raw: unknown): DayTemplate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => {
      const o = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
      const blocks = Array.isArray(o.blocks) ? o.blocks.map(sanitizeTemplateBlock).filter((b): b is TemplateBlock => !!b).slice(0, 60) : [];
      const name = cleanText(o.name, 60);
      const id = typeof o.id === "string" && o.id ? o.id.slice(0, 40) : "";
      return name && id && blocks.length ? { id, name, blocks } : null;
    })
    .filter((t): t is DayTemplate => !!t)
    .slice(0, 20);
}

export function templateFromColumn(placed: Placed[], name: string, id: string): DayTemplate {
  return {
    id,
    name,
    blocks: placed.map((p) => ({
      s: p.s,
      e: p.e,
      label: p.block.label,
      icon: p.block.icon,
      color: p.block.color,
      tasks: p.block.tasks ?? [],
      notes: p.block.notes ?? null,
      notify: !!p.block.notify,
      link_ref: p.block.link_ref ?? null,
    })),
  };
}

// ── Couleurs / icônes par type (variables de thème uniquement) ────────────

export const KIND_STYLE: Record<string, { icon: string; color: string }> = {
  seance: { icon: "salle", color: "var(--ep-accent)" },
  repas: { icon: "repas", color: "var(--ep-warn)" },
  travail: { icon: "travail", color: "var(--ep-info)" },
  trajet: { icon: "trajet", color: "var(--ep-ok)" },
  pause: { icon: "pause", color: "var(--ep-gold)" },
  libre: { icon: "libre", color: "var(--ep-violet)" },
  bilan: { icon: "bilan", color: "var(--ep-violet)" },
};

// ── Générateur « Construire ma semaine » ──────────────────────────────────

export interface GenBlock {
  col: number;
  s: number;
  e: number;
  label: string;
  icon: string;
  color: string;
  link_ref: string | null;
  tasks: string[];
  notify: boolean;
  /** Origine, pour l'aperçu. */
  source: "seance" | "repas" | "trajet" | "travail" | "pause" | "libre" | "bilan" | "reveil";
}

export interface GenSession {
  label: string;
}

export interface BuildInput {
  window: DayWindow;
  prefs: AgendaPrefs;
  /** Séance du programme par jour (1..7), selon le jour choisi. */
  sessionsByDay: Record<number, GenSession | undefined>;
  /** Créneaux de repas de la diète par jour (1..7). */
  mealSlotsByDay: Record<number, string[]>;
  /** Mode « compléter » : blocs déjà là (récurrents), gardés tels quels. */
  existing?: Placed[];
  /** Colonnes qui ont déjà un réveil (alarme) : on n'en recrée pas. */
  alarmCols?: number[];
}

interface Iv {
  s: number;
  e: number;
}

function freeAt(start: number, dur: number, busy: Iv[], lo: number, hi: number, maxShift = 6 * 60): number | null {
  // Position libre la plus proche de `start` (avant ou après), par pas de
  // 5 min, dans [lo, hi - dur].
  const fits = (a: number) => a >= lo && a + dur <= hi && !busy.some((b) => overlaps({ s: a, e: a + dur }, b));
  for (let d = 0; d <= maxShift; d += 5) {
    if (fits(start + d)) return start + d;
    if (d > 0 && fits(start - d)) return start - d;
  }
  return null;
}

/** Début libre le plus proche de `start` pour `dur` minutes, ou null. */
export function findFreeStart(start: number, dur: number, busy: { s: number; e: number }[], lo: number, hi: number): number | null {
  return freeAt(start, dur, busy, lo, hi);
}

export function absOfClock(time: string, w: DayWindow): number {
  const t = toMin(time);
  return isOvernight(w) && t < w.end ? t + 1440 : t;
}

/** Heure souhaitée d'un bloc fixe selon son moment préféré. */
function wantedFor(when: WorkWhen, ws: number, we: number): number {
  const len = we - ws;
  if (when === "matin") return snap(ws + len * 0.07); // 6h-22h : vers 7h
  if (when === "apres-midi") return snap(ws + len * 0.53); // vers 14h30
  if (when === "soir") return snap(ws + len * 0.78); // vers 18h30
  return snap(ws + len * 0.45); // vers 13h
}

/**
 * Remplit chaque journée de la semaine, sans trou, de l'heure de début à
 * l'heure de fin : bilan du soir, séance du programme (trajets compris),
 * repas de la diète (pré/post autour de la séance), blocs fixes (tournage,
 * apprentissage...), puis le reste en blocs de remplissage (ou temps libre).
 */
export function buildWeek(input: BuildInput): GenBlock[] {
  const { window: w, prefs } = input;
  const { s: ws, e: we } = windowSpan(w);
  const out: GenBlock[] = [];
  const notifyOn = prefs.notify;
  const fillersItems = prefs.work.filter((it) => it.minutes <= 0);
  const fixedItems = prefs.work.filter((it) => it.minutes > 0);
  const fillRotation = { i: 0 };
  const alarmCols = new Set(input.alarmCols ?? []);

  for (const col of ALL_DAYS) {
    const existing = (input.existing ?? []).filter((p) => p.col === col);
    const fixed: Iv[] = existing.map((p) => ({ s: p.s, e: p.e }));
    const dayBlocks: GenBlock[] = [];
    const busy = (): Iv[] => [...fixed, ...dayBlocks];
    const push = (b: Omit<GenBlock, "col">) => dayBlocks.push({ ...b, col });
    const extra: GenBlock[] = [];

    // 0. Réveil : vraie alarme à l'heure de début, hors grille (ne compte pas comme un bloc).
    if (prefs.wakeAlarm && !alarmCols.has(col) && !existing.some((p) => /r[ée]veil/i.test(p.block.label))) {
      extra.push({ col, s: ws, e: ws + 5, label: "Réveil", icon: "sommeil", color: "var(--ep-violet)", link_ref: null, tasks: [], notify: true, source: "reveil" });
    }

    // 1. Bilan du jour en fin de journée.
    if (prefs.eveningReview && !existing.some((p) => /bilan/i.test(p.block.label))) {
      const d = prefs.reviewMinutes;
      const a = freeAt(we - d, d, busy(), ws, we);
      if (a !== null) push({ s: a, e: a + d, label: "Bilan du jour", ...KIND_STYLE.bilan, link_ref: null, tasks: [], notify: notifyOn, source: "bilan" });
    }

    // 2. Séance du programme + trajets aller/retour.
    const session = input.sessionsByDay[col];
    let sessionIv: Iv | null = null;
    let travelIv: Iv | null = null;
    const hasExistingSession = existing.some((p) => blockKind(p.block) === "seance");
    if (session && !hasExistingSession) {
      const dur = prefs.sessionMinutes;
      const travel = prefs.gymTravelMinutes;
      const total = dur + travel * 2;
      // Place pour le repas pré-entraînement avant de partir, s'il est prévu.
      const preRoom = (input.mealSlotsByDay[col] ?? []).includes("preworkout") ? prefs.mealMinutes + 30 : 0;
      const wanted = absOfClock(prefs.sessionTime, w) - travel;
      const a = freeAt(Math.max(ws + preRoom, Math.min(wanted, we - total)), total, busy(), ws + preRoom, we);
      if (a !== null) {
        let cur = a;
        if (travel > 0) {
          push({ s: cur, e: cur + travel, label: "Trajet vers la salle", ...KIND_STYLE.trajet, link_ref: prefs.gymTravelMode, tasks: [], notify: false, source: "trajet" });
          cur += travel;
        }
        push({ s: cur, e: cur + dur, label: `Séance : ${session.label}`, ...KIND_STYLE.seance, link_ref: session.label, tasks: [], notify: notifyOn, source: "seance" });
        sessionIv = { s: cur, e: cur + dur };
        cur += dur;
        if (travel > 0) {
          push({ s: cur, e: cur + travel, label: "Retour de la salle", ...KIND_STYLE.trajet, link_ref: prefs.gymTravelMode, tasks: [], notify: false, source: "trajet" });
          cur += travel;
        }
        travelIv = { s: a, e: cur };
      }
    }

    // 3. Repas de la diète, aux heures de la journée de la personne.
    const existingSlots = new Set(existing.filter((p) => blockKind(p.block) === "repas").map((p) => mealSlotOf(p.block)));
    const slots = (input.mealSlotsByDay[col] ?? []).filter((sl) => !existingSlots.has(sl));
    const mealDur = prefs.mealMinutes;
    const ordered = [...slots].sort((x, y) => MEAL_SLOT_ORDER.indexOf(x) - MEAL_SLOT_ORDER.indexOf(y));
    // Pré et post d'abord : ils sont accrochés à la séance, les autres repas s'écartent.
    const prePost = ordered.filter((sl) => sl === "preworkout" || sl === "postworkout");
    const others = ordered.filter((sl) => sl !== "preworkout" && sl !== "postworkout");
    for (const slot of [...prePost, ...others]) {
      let wanted = defaultMealAbs(slot, w);
      let maxShift = 6 * 60;
      let lo = ws;
      let hi = we;
      if (travelIv && slot === "preworkout") {
        wanted = travelIv.s - 30 - mealDur; // fini ~30 min avant de partir
        maxShift = 3 * 60;
        hi = travelIv.s;
      }
      if (travelIv && slot === "postworkout") {
        wanted = travelIv.e;
        maxShift = 2 * 60;
        lo = travelIv.e;
      }
      const a = freeAt(Math.max(lo, Math.min(wanted, hi - mealDur)), mealDur, busy(), lo, hi, maxShift);
      if (a === null) continue;
      push({ s: a, e: a + mealDur, label: MEAL_SLOT_NAMES[slot] ?? "Repas", ...KIND_STYLE.repas, link_ref: slot, tasks: [], notify: notifyOn, source: "repas" });
      // Marche digestive juste après le déjeuner et le dîner.
      if (prefs.digestiveWalk && (slot === "lunch" || slot === "dinner")) {
        const w2 = a + mealDur;
        if (!busy().some((b) => overlaps({ s: w2, e: w2 + 15 }, b)) && w2 + 15 <= we) {
          push({ s: w2, e: w2 + 15, label: "Marche digestive", icon: "pas", color: KIND_STYLE.trajet.color, link_ref: "marche", tasks: [], notify: false, source: "trajet" });
        }
      }
    }
    void sessionIv;

    // 4. Blocs fixes (« Tournage 1h le matin », « Apprentissage 1h par jour »).
    for (const it of fixedItems) {
      if (!it.days.includes(col)) continue;
      if (existing.some((p) => p.block.label.trim().toLowerCase() === it.label.trim().toLowerCase())) continue;
      const a = freeAt(wantedFor(it.when, ws, we), it.minutes, busy(), ws, we, 10 * 60);
      if (a === null) continue;
      push({ s: a, e: a + it.minutes, label: it.label, ...KIND_STYLE.travail, link_ref: null, tasks: it.tasks, notify: notifyOn, source: "travail" });
    }

    // 5. Les trous : remplissage les jours travaillés, temps libre sinon.
    const isWorkDay = prefs.workDays.includes(col);
    const fillWith: WorkItem[] = fillersItems.length ? fillersItems : prefs.work.length ? [] : [{ label: "Travail", tasks: [], minutes: 0, when: "libre", days: ALL_DAYS }];
    const gaps = findGaps(busy(), w, 1);
    const fillers: GenBlock[] = [];
    const freeBlock = (s0: number, e0: number) => ({ col, s: s0, e: e0, label: "Temps libre", ...KIND_STYLE.libre, link_ref: null, tasks: [], notify: false, source: "libre" as const });
    const pause = (s0: number, e0: number) => ({ col, s: s0, e: e0, label: "Pause", ...KIND_STYLE.pause, link_ref: null, tasks: [], notify: false, source: "pause" as const });
    for (const g of gaps) {
      const len = g.e - g.s;
      // Petit trou : on allonge le bloc d'avant (ou celui d'après) plutôt que de créer un bloc minuscule.
      if (len < 15) {
        const stretchable = (b: GenBlock) => b.source === "travail" || b.source === "repas" || b.source === "bilan";
        const before = [...dayBlocks, ...fillers].find((b) => b.e === g.s && stretchable(b));
        const after = [...dayBlocks, ...fillers].find((b) => b.s === g.e && stretchable(b));
        if (before) before.e = g.e;
        else if (after) after.s = g.s;
        else fillers.push(pause(g.s, g.e));
        continue;
      }
      if (!isWorkDay || fillWith.length === 0) {
        fillers.push(freeBlock(g.s, g.e));
        continue;
      }
      if (len < 25) {
        fillers.push(pause(g.s, g.e));
        continue;
      }
      // Découpe en sessions régulières <= chunkMinutes, séparées (au choix)
      // par 10 min de pause : 3h30 de libre = 3 sessions de 1h10, pas
      // 1h30 + 1h30 + 30 min.
      const chunk = prefs.chunkMinutes;
      const brk = prefs.breaks ? 10 : 0;
      const n = Math.max(1, Math.ceil((len + brk) / (chunk + brk)));
      const piece = snap((len - brk * (n - 1)) / n);
      let cur = g.s;
      for (let k = 0; k < n; k++) {
        const end = k === n - 1 ? g.e : cur + piece;
        const item = fillWith[fillRotation.i % fillWith.length];
        fillRotation.i++;
        fillers.push({ col, s: cur, e: end, label: item.label, ...KIND_STYLE.travail, link_ref: null, tasks: item.tasks, notify: notifyOn, source: "travail" });
        cur = end;
        if (k < n - 1 && brk) {
          fillers.push(pause(cur, cur + brk));
          cur += brk;
        }
      }
    }

    // 6. Trajet domicile-travail : pris sur le premier et le dernier bloc de travail.
    const workBlocks = [...dayBlocks, ...fillers].filter((f) => f.source === "travail").sort((x, y) => x.s - y.s);
    const wt = prefs.workTravelMinutes;
    if (isWorkDay && wt > 0 && workBlocks.length) {
      const first = workBlocks[0];
      if (first.e - first.s >= wt + 25) {
        fillers.push({ col, s: first.s, e: first.s + wt, label: "Trajet vers le travail", ...KIND_STYLE.trajet, link_ref: prefs.workTravelMode, tasks: [], notify: false, source: "trajet" });
        first.s += wt;
      }
      const last = workBlocks[workBlocks.length - 1];
      if (last !== first && last.e - last.s >= wt + 25) {
        fillers.push({ col, s: last.e - wt, e: last.e, label: "Retour du travail", ...KIND_STYLE.trajet, link_ref: prefs.workTravelMode, tasks: [], notify: false, source: "trajet" });
        last.e -= wt;
      }
    }

    out.push(...extra, ...dayBlocks, ...fillers);
  }
  return out.sort((x, y) => x.col - y.col || x.s - y.s);
}

export interface WeekStats {
  workMinutes: number;
  sessions: number;
  meals: number;
  travelMinutes: number;
  steps: number;
  gapMinutes: number;
}

export function genStats(blocks: GenBlock[], w: DayWindow, existing: Placed[] = []): WeekStats {
  let workMinutes = 0;
  let sessions = 0;
  let meals = 0;
  let travelMinutes = 0;
  let steps = 0;
  for (const b of blocks) {
    const d = b.e - b.s;
    if (b.source === "travail") workMinutes += d;
    if (b.source === "seance") sessions++;
    if (b.source === "repas") meals++;
    if (b.source === "trajet") {
      travelMinutes += d;
      steps += travelSteps(isTravelMode(b.link_ref) ? b.link_ref : "voiture", d);
    }
  }
  // Blocs déjà là (mode « compléter ») : comptés aussi, l'aperçu montre la semaine entière.
  for (const p of existing) {
    const d = p.e - p.s;
    const k = blockKind(p.block);
    if (/r[ée]veil/i.test(p.block.label)) continue;
    if (k === "travail") workMinutes += d;
    if (k === "seance") sessions++;
    if (k === "repas") meals++;
    if (k === "trajet") {
      travelMinutes += d;
      steps += travelSteps(travelModeOf(p.block), d);
    }
  }
  let gapMinutes = 0;
  for (const col of ALL_DAYS) {
    const ivs = [...blocks.filter((b) => b.col === col && b.source !== "reveil"), ...existing.filter((p) => p.col === col && !/r[ée]veil/i.test(p.block.label))];
    gapMinutes += findGaps(ivs, w, 1).reduce((sum, g) => sum + (g.e - g.s), 0);
  }
  return { workMinutes, sessions, meals, travelMinutes, steps, gapMinutes };
}

/** Jours proposés pour n séances quand le programme ne les fixe pas. */
export function suggestedTrainingDays(n: number): number[] {
  const patterns: Record<number, number[]> = {
    1: [3],
    2: [2, 5],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6],
    7: [1, 2, 3, 4, 5, 6, 7],
  };
  return patterns[Math.max(1, Math.min(7, n))] ?? [];
}
