// Pilote de phase : ce que la road map dit de la phase EN COURS, calculé à
// partir des suivis déjà saisis (pesées, tracker nutrition, séances,
// sommeil), sans aucune nouvelle saisie.
//
// Pourquoi (audit 2026-09-28) : la road map n'était qu'une frise statique.
// La barre des objectifs montrait le TEMPS écoulé, jamais le réel, et
// personne ne disait au fondateur (PDM démarrée le 2026-08-17, compétition
// WNBF le 2027-12-06) s'il était sur la bonne trajectoire alors que toutes
// les données existaient déjà dans l'appli.
//
// Module PUR (aucun import serveur) : calculable côté serveur
// (utils/phase-pilot.ts charge les données) et testable avec un simple
// script. Toutes les dates sont des chaînes YYYY-MM-DD manipulées en UTC
// (lib/roadmap-weeks.ts), jamais de new Date(iso) en heure locale.
//
// Les couloirs de vitesse de poids sont des REPÈRES de la littérature, jamais
// une prescription, et rien ici ne propose d'ajuster les calories : le
// fondateur est mineur, c'est un tableau de bord, pas un coach automatique.
//   - Prise de masse naturelle : +0,25 à +0,5 % du poids de corps par semaine
//     (Iraki et al. 2019, "Nutrition Recommendations for Bodybuilders in the
//     Off-Season", Sports 7(7):154, DOI 10.3390/sports7070154).
//   - Sèche : -0,5 à -1 % par semaine (Helms et al. 2014, "Evidence-based
//     recommendations for natural bodybuilding contest preparation", JISSN
//     11:20, DOI 10.1186/1550-2783-11-20).
//   - Maintenance / diet break : stable, plus ou moins 0,25 % par semaine.

import { PHASE_COLORS } from "@/lib/roadmap-colors";
import {
  addDaysIso,
  countRoadmapWeeks,
  diffDaysIso,
  formatIsoFr,
  maxIso,
  roadmapWeekIndex,
} from "@/lib/roadmap-weeks";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PilotPerspective = "self" | "coach";
export type PilotTone = "ok" | "warn" | "bad" | "info";

export interface PilotPhaseInput {
  type: string;
  label: string;
  start_date: string;
  end_date: string;
}

export interface PilotObjectiveInput {
  type: string;
  label: string;
  target_date: string;
  is_achieved: boolean;
}

export interface WeightPoint {
  date: string;
  kg: number;
}

export interface PhasePilotInput {
  roadmap: { start_date: string; end_date: string };
  phases: PilotPhaseInput[];
  objectives: PilotObjectiveInput[];
  today: string;
  /** Pesées du matin (daily_logs.weight_morning), une par jour. */
  weights: WeightPoint[];
  /** Totaux du tracker par jour (food_logs agrégés). */
  foodDays: { date: string; kcal: number; protein: number }[];
  /** Dates des séances terminées. */
  sessionDates: string[];
  sleep: { date: string; hours: number }[];
  targets: { kcal: number | null; protein: number | null; sessionsPerWeek: number | null };
  /** profiles.competition_date, dernier repli pour le compte à rebours. */
  competitionDate: string | null;
  /** nutrition_profiles.age : repère de sommeil ado (8 h) ou adulte (7 h). */
  age: number | null;
  /** Le programme actif planifie déjà ses décharges (mésocycle configuré). */
  programHasMesocycle: boolean;
  /** "self" : tutoiement ; "coach" : un coach regarde la road map d'un client. */
  perspective: PilotPerspective;
}

export interface PilotPhaseColors {
  solid: string;
  bg: string;
  border: string;
  icon: string;
  label: string;
}

export interface PilotTile {
  key: "weight" | "kcal" | "training" | "sleep";
  label: string;
  value: string;
  sub: string;
  tone: PilotTone;
}

export interface PilotWeightTrend {
  kgPerWeek: number;
  pctPerWeek: number;
  n: number;
  spanDays: number;
  /** Date du premier point de la régression (x = 0). */
  day0: string;
  /** Poids ajusté à day0, en kg. */
  intercept: number;
  slopePerDay: number;
  latestKg: number;
  latestDate: string;
  referenceKg: number;
  /** Poids ajusté en fin de phase au rythme actuel, null si tendance fragile. */
  projectedEndKg: number | null;
  /** Demi-largeur de l'intervalle de confiance à 95 % de la pente, en %/sem. */
  marginPctPerWeek: number;
  /** Moins de 8 pesées, moins de 3 semaines couvertes, ou pente trop incertaine. */
  fragile: boolean;
}

export interface PhasePilot {
  today: string;
  perspective: PilotPerspective;
  status: "before" | "active" | "gap" | "after";
  headline: string;
  roadmapWeek: number | null;
  roadmapTotalWeeks: number;
  activePhase: (PilotPhaseInput & { colors: PilotPhaseColors }) | null;
  weekIndex: number | null;
  totalWeeks: number | null;
  daysLeftInPhase: number | null;
  phaseProgressPct: number | null;
  nextPhase: { label: string; type: string; start_date: string; startsInDays: number; colors: PilotPhaseColors } | null;
  competition: { label: string; date: string; daysLeft: number } | null;
  corridor: { min: number; max: number; inherited: boolean } | null;
  weightTrend: PilotWeightTrend | null;
  /** Pesées de la fenêtre de tendance, pour la courbe. */
  weightSeries: WeightPoint[];
  verdict: { tone: "ok" | "warn" | "info"; text: string };
  tiles: PilotTile[];
  deloadHint: { tone: "info" | "warn"; text: string } | null;
  ctas: { key: "bilan" | "nutrition" | "logbook"; label: string }[];
  /** Pour la vraie progression des objectifs de poids (RoadmapSummary). */
  weights: { latest: WeightPoint | null; roadmapStartKg: number | null };
}

// ── Repères ───────────────────────────────────────────────────────────────────

/** Couloirs de vitesse de poids, en % du poids de corps par semaine. */
export const PHASE_RATE_CORRIDORS: Readonly<Record<string, { min: number; max: number }>> = {
  masse: { min: 0.25, max: 0.5 },
  deficit: { min: -1, max: -0.5 },
  maintenance: { min: -0.25, max: 0.25 },
  diet_break: { min: -0.25, max: 0.25 },
};

// Phases courtes qui n'ont pas de sens nutritionnel propre : elles héritent
// du couloir de la dernière phase nutritionnelle qui les précède.
const INHERITING_TYPES = new Set(["deload", "devolume", "refeed"]);
// Phases trop courtes pour une tendance calculée sur elles seules : on garde
// la fenêtre glissante sans la couper au début de la phase.
const SHORT_TYPES = new Set(["deload", "devolume", "refeed", "diet_break", "peak_week", "competition"]);
const DELOAD_TYPES = new Set(["deload", "devolume"]);
const TRAINING_BLOCK_TYPES = new Set(["masse", "deficit", "maintenance", "custom"]);

const CORRIDOR_CONTEXT: Record<string, string> = {
  masse: "d'une PDM naturelle",
  deficit: "d'une sèche",
  maintenance: "du maintien",
  diet_break: "d'un diet break",
};

// Fenêtre de tendance : 6 semaines. Testé sur les vraies pesées du
// fondateur (pesées au kilo près, espacées) : sur 35 jours la pente sautait à
// plus de 1 kg/sem au gré de deux pesées, alarmiste ; sur 6 semaines elle
// reste lisible tout en suivant un changement de rythme en cours de phase.
const TREND_WINDOW_DAYS = 42;
const TREND_MIN_POINTS = 5;
const TREND_MIN_SPAN_DAYS = 14;
const TREND_SOLID_POINTS = 8;
const TREND_SOLID_SPAN_DAYS = 21;
// Au-delà de 0,25 %/sem d'incertitude (la largeur du couloir de PDM), la
// pente ne permet pas de dire si on est dans le couloir ou non. Vérifié sur
// les pesées du fondateur (au kilo près, espacées) : 10 pesées sur 40 jours
// donnent 0,58 kg/sem mais à plus ou moins 0,5 %/sem, et la même série prise
// un jour plus tôt donne 0,39 kg/sem. Annoncer "au-dessus du couloir" sur
// une telle série serait trompeur : on la dit fragile et on invite à se
// peser plus souvent.
const TREND_MAX_MARGIN_PCT = 0.25;
const NUTRITION_WINDOW_DAYS = 14;
const TRAINING_WINDOW_DAYS = 28;
const SLEEP_WINDOW_DAYS = 14;
// Un jour de tracker sous 60 % de la cible est presque toujours un jour
// logué à moitié : il fausserait la moyenne vers le bas.
const COMPLETE_DAY_RATIO = 0.6;

// ── Formatage ─────────────────────────────────────────────────────────────────

function nf(n: number, digits = 1): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
}

// Signe écrit à la main : on maîtrise le caractère (jamais un tiret long ou
// un signe moins typographique selon la version d'Intl).
function signed(n: number, digits = 2): string {
  const r = Number(n.toFixed(digits));
  if (r === 0) return "0";
  return `${r > 0 ? "+" : "-"}${nf(Math.abs(r), digits)}`;
}

function dateFr(iso: string, withYear = false): string {
  return formatIsoFr(iso, withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
}

function plural(n: number, one: string, many: string): string {
  return `${nf(n, 0)} ${Math.abs(n) > 1 ? many : one}`;
}

function colorsFor(type: string): PilotPhaseColors {
  const c = PHASE_COLORS[type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;
  return { solid: c.solid, bg: c.bg, border: c.border, icon: c.icon, label: c.label };
}

// ── Tendance de poids ─────────────────────────────────────────────────────────

/**
 * Régression linéaire (moindres carrés) du poids sur les jours écoulés depuis
 * la première pesée. null sous 5 pesées ou 14 jours couverts : en dessous, le
 * bruit d'une pesée (eau, repas de la veille) domine la tendance.
 */
export function linearTrend(
  points: WeightPoint[]
): {
  slopePerDay: number;
  intercept: number;
  n: number;
  spanDays: number;
  day0: string;
  mean: number;
  /** Erreur type de la pente (kg/jour). */
  seSlopePerDay: number;
} | null {
  if (points.length < TREND_MIN_POINTS) return null;
  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const day0 = sorted[0].date;
  const xs = sorted.map((p) => diffDaysIso(day0, p.date));
  const ys = sorted.map((p) => p.kg);
  const spanDays = xs[xs.length - 1];
  if (spanDays < TREND_MIN_SPAN_DAYS) return null;
  const n = sorted.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const slopePerDay = num / den;
  const intercept = my - slopePerDay * mx;
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (ys[i] - (intercept + slopePerDay * xs[i])) ** 2;
  const seSlopePerDay = Math.sqrt(sse / (n - 2) / den);
  return { slopePerDay, intercept, n, spanDays, day0, mean: my, seSlopePerDay };
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

function inWindow<T extends { date: string }>(rows: T[], from: string, to: string): T[] {
  return rows.filter((r) => r.date >= from && r.date <= to);
}

// ── Calcul principal ──────────────────────────────────────────────────────────

export function computePhasePilot(input: PhasePilotInput): PhasePilot {
  const { today, roadmap, perspective } = input;
  const self = perspective === "self";
  const phases = [...input.phases].sort((a, b) => (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0));
  const weights = [...input.weights].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // ── Où en est-on ────────────────────────────────────────────────────────────
  const active = phases.find((p) => p.start_date <= today && p.end_date >= today) ?? null;
  const status: PhasePilot["status"] = active
    ? "active"
    : today < roadmap.start_date
    ? "before"
    : today > roadmap.end_date
    ? "after"
    : "gap";

  const roadmapTotalWeeks = countRoadmapWeeks(roadmap.start_date, roadmap.end_date);
  const rawWeek = roadmapWeekIndex(roadmap.start_date, today);
  const roadmapWeek = status === "before" ? null : Math.min(Math.max(rawWeek, 1), roadmapTotalWeeks || rawWeek);

  const next = phases.find((p) => p.start_date > today) ?? null;
  const nextPhase = next
    ? {
        label: next.label || colorsFor(next.type).label,
        type: next.type,
        start_date: next.start_date,
        startsInDays: diffDaysIso(today, next.start_date),
        colors: colorsFor(next.type),
      }
    : null;

  let weekIndex: number | null = null;
  let totalWeeks: number | null = null;
  let daysLeftInPhase: number | null = null;
  let phaseProgressPct: number | null = null;
  if (active) {
    const phaseDays = diffDaysIso(active.start_date, active.end_date) + 1;
    const elapsed = diffDaysIso(active.start_date, today) + 1;
    weekIndex = Math.floor((elapsed - 1) / 7) + 1;
    totalWeeks = Math.ceil(phaseDays / 7);
    daysLeftInPhase = diffDaysIso(today, active.end_date);
    phaseProgressPct = Math.min(100, Math.max(0, (elapsed / phaseDays) * 100));
  }

  // Compte à rebours : objectif "Compétition" non atteint, sinon phase
  // "Compétition" à venir, sinon la date de compétition du profil.
  const compObjective = input.objectives
    .filter((o) => o.type === "competition" && !o.is_achieved && o.target_date >= today)
    .sort((a, b) => (a.target_date < b.target_date ? -1 : 1))[0];
  const compPhase = phases.find((p) => p.type === "competition" && p.start_date >= today);
  const competition = compObjective
    ? { label: compObjective.label || "Compétition", date: compObjective.target_date, daysLeft: diffDaysIso(today, compObjective.target_date) }
    : compPhase
    ? { label: compPhase.label || "Compétition", date: compPhase.start_date, daysLeft: diffDaysIso(today, compPhase.start_date) }
    : input.competitionDate && input.competitionDate >= today
    ? { label: "Compétition", date: input.competitionDate, daysLeft: diffDaysIso(today, input.competitionDate) }
    : null;

  // ── Couloir de la phase ─────────────────────────────────────────────────────
  let corridor: PhasePilot["corridor"] = null;
  let corridorType: string | null = null;
  if (active) {
    if (PHASE_RATE_CORRIDORS[active.type]) {
      corridor = { ...PHASE_RATE_CORRIDORS[active.type], inherited: false };
      corridorType = active.type;
    } else if (INHERITING_TYPES.has(active.type)) {
      const before = phases.filter((p) => p.start_date < active.start_date && PHASE_RATE_CORRIDORS[p.type]);
      const last = before[before.length - 1];
      if (last) {
        corridor = { ...PHASE_RATE_CORRIDORS[last.type], inherited: true };
        corridorType = last.type;
      }
    }
  }

  // ── Tendance de poids ───────────────────────────────────────────────────────
  const windowStart = addDaysIso(today, -(TREND_WINDOW_DAYS - 1));
  const cutAtPhase = active && !SHORT_TYPES.has(active.type);
  let series = inWindow(weights, cutAtPhase ? maxIso(windowStart, active.start_date) : windowStart, today);
  // Longue phase mais peu de pesées récentes : repli sur toute la phase.
  if (series.length < TREND_MIN_POINTS && cutAtPhase && active.start_date < windowStart) {
    series = inWindow(weights, active.start_date, today);
  }
  const fit = linearTrend(series);
  const latest = last(weights.filter((w) => w.date <= today)) ?? null;

  let weightTrend: PilotWeightTrend | null = null;
  if (fit) {
    const kgPerWeek = fit.slopePerDay * 7;
    const marginPctPerWeek = ((1.96 * fit.seSlopePerDay * 7) / fit.mean) * 100;
    const fragile =
      fit.n < TREND_SOLID_POINTS || fit.spanDays < TREND_SOLID_SPAN_DAYS || marginPctPerWeek > TREND_MAX_MARGIN_PCT;
    const lastPoint = series[series.length - 1];
    weightTrend = {
      kgPerWeek,
      pctPerWeek: (kgPerWeek / fit.mean) * 100,
      n: fit.n,
      spanDays: fit.spanDays,
      day0: fit.day0,
      intercept: fit.intercept,
      slopePerDay: fit.slopePerDay,
      latestKg: lastPoint.kg,
      latestDate: lastPoint.date,
      referenceKg: fit.mean,
      projectedEndKg:
        active && corridor && !fragile && daysLeftInPhase != null && daysLeftInPhase > 0
          ? fit.intercept + fit.slopePerDay * diffDaysIso(fit.day0, active.end_date)
          : null,
      marginPctPerWeek,
      fragile,
    };
  }

  // ── Verdict ─────────────────────────────────────────────────────────────────
  let weightTone: PilotTone = "info";
  let verdict: PhasePilot["verdict"];
  const phaseName = active ? active.label || colorsFor(active.type).label : "";

  const movePhrase = (t: PilotWeightTrend): string => {
    const kg = nf(Math.abs(t.kgPerWeek), 2);
    const pct = nf(Math.abs(t.pctPerWeek), 2);
    if (Math.abs(t.pctPerWeek) < 0.05) return self ? `Ton poids est stable (${signed(t.kgPerWeek)} kg/sem)` : `Poids stable (${signed(t.kgPerWeek)} kg/sem)`;
    if (t.kgPerWeek > 0) return self ? `Tu prends ${kg} kg/sem (${pct} %/sem)` : `Prise de ${kg} kg/sem (${pct} %/sem)`;
    return self ? `Tu perds ${kg} kg/sem (${pct} %/sem)` : `Perte de ${kg} kg/sem (${pct} %/sem)`;
  };
  const corridorRange = (type: string, c: { min: number; max: number }): string =>
    type === "deficit"
      ? `${nf(Math.abs(c.max), 2)} à ${nf(Math.abs(c.min), 2)} %/sem de perte`
      : c.min < 0
      ? `plus ou moins ${nf(c.max, 2)} %/sem`
      : `${nf(c.min, 2)} à ${nf(c.max, 2)} %/sem`;

  if (status === "before") {
    const startsIn = diffDaysIso(today, roadmap.start_date);
    verdict = {
      tone: "info",
      text: `La road map démarre le ${dateFr(roadmap.start_date, true)} (J-${startsIn}). Le pilote s'allumera avec la première phase.`,
    };
  } else if (status === "after") {
    verdict = {
      tone: "info",
      text: self
        ? `Road map terminée le ${dateFr(roadmap.end_date, true)}. Prolonge-la ou construis la suivante pour garder un cap.`
        : `Road map terminée le ${dateFr(roadmap.end_date, true)}.`,
    };
  } else if (status === "gap") {
    verdict = {
      tone: "info",
      text: nextPhase
        ? `Aucune phase en cours : la prochaine (${nextPhase.label}) démarre dans ${plural(nextPhase.startsInDays, "jour", "jours")}.`
        : "Aucune phase en cours ni à venir sur la road map.",
    };
  } else if (!weightTrend) {
    const count = series.length;
    verdict = {
      tone: "info",
      text: self
        ? `Pas assez de pesées pour une tendance fiable : il en faut ${TREND_MIN_POINTS} sur au moins 2 semaines (tu en as ${count} sur la période).`
        : `Pas assez de pesées pour une tendance fiable : il en faut ${TREND_MIN_POINTS} sur au moins 2 semaines (${count} sur la période).`,
    };
  } else if (!corridor || !corridorType) {
    verdict = {
      tone: "info",
      text: `${movePhrase(weightTrend)}. Pas de couloir de poids repère pour une phase « ${phaseName} ».`,
    };
  } else {
    const pct = weightTrend.pctPerWeek;
    const range = corridorRange(corridorType, corridor);
    const ctx = CORRIDOR_CONTEXT[corridorType] ?? "";
    const inherited = corridor.inherited ? ` (couloir de la phase précédente)` : "";
    if (weightTrend.fragile) {
      verdict = {
        tone: "info",
        text: `Tendance encore fragile (${plural(weightTrend.n, "pesée", "pesées")} sur ${plural(weightTrend.spanDays, "jour", "jours")}, marge de plus ou moins ${nf(weightTrend.marginPctPerWeek, 2)} %/sem) : ${lowerFirst(movePhrase(weightTrend))}. Repère ${ctx} : ${range}${inherited}. ${self ? "Pèse-toi plus régulièrement pour la fiabiliser." : "Des pesées plus régulières la rendront fiable."}`,
      };
    } else if (pct >= corridor.min && pct <= corridor.max) {
      weightTone = "ok";
      verdict = { tone: "ok", text: `${movePhrase(weightTrend)} : dans le couloir repère ${ctx} (${range})${inherited}.` };
    } else {
      const width = corridor.max - corridor.min;
      const dist = pct < corridor.min ? corridor.min - pct : pct - corridor.max;
      const qual = dist <= width / 2 ? "un poil " : dist <= width * 1.5 ? "" : "nettement ";
      const dir =
        corridorType === "deficit"
          ? pct > corridor.max
            ? "plus lent que le couloir"
            : "plus rapide que le couloir"
          : pct > corridor.max
          ? "au-dessus du couloir"
          : "en dessous du couloir";
      weightTone = qual === "nettement " ? "bad" : "warn";
      verdict = { tone: "warn", text: `${movePhrase(weightTrend)} : ${qual}${dir} repère ${ctx} (${range})${inherited}.` };
    }
  }

  // ── Tuiles ──────────────────────────────────────────────────────────────────
  const tiles: PilotTile[] = [];

  // Poids
  if (weightTrend) {
    tiles.push({
      key: "weight",
      label: "Tendance poids",
      value: `${signed(weightTrend.kgPerWeek)} kg/sem`,
      sub: `${nf(weightTrend.latestKg, 1)} kg le ${dateFr(weightTrend.latestDate)} · ${plural(weightTrend.n, "pesée", "pesées")}${weightTrend.fragile ? " · fragile" : ""}`,
      tone: weightTrend.fragile || !corridor ? "info" : weightTone,
    });
  } else {
    tiles.push({
      key: "weight",
      label: "Tendance poids",
      value: latest ? `${nf(latest.kg, 1)} kg` : "Aucune pesée",
      sub: `Pas de tendance : ${plural(series.length, "pesée récente", "pesées récentes")}, il en faut ${TREND_MIN_POINTS} sur 2 semaines`,
      tone: series.length === 0 ? "bad" : "warn",
    });
  }

  // Nutrition : les 14 jours TERMINÉS (hier inclus, pas aujourd'hui, encore en cours).
  const nutriFrom = addDaysIso(today, -NUTRITION_WINDOW_DAYS);
  const nutriTo = addDaysIso(today, -1);
  const foodWindow = inWindow(input.foodDays, nutriFrom, nutriTo).filter((d) => d.kcal > 0);
  const kcalTarget = input.targets.kcal && input.targets.kcal > 0 ? input.targets.kcal : null;
  const proteinTarget = input.targets.protein && input.targets.protein > 0 ? input.targets.protein : null;
  const completeDays = kcalTarget ? foodWindow.filter((d) => d.kcal >= kcalTarget * COMPLETE_DAY_RATIO) : foodWindow;
  const avgKcal = completeDays.length ? completeDays.reduce((s, d) => s + d.kcal, 0) / completeDays.length : null;
  const avgProtein = completeDays.length ? completeDays.reduce((s, d) => s + d.protein, 0) / completeDays.length : null;
  const nutritionTone: PilotTone =
    completeDays.length >= 10 ? "ok" : completeDays.length >= 5 ? "warn" : "bad";
  const partialDays = foodWindow.length - completeDays.length;
  tiles.push({
    key: "kcal",
    label: "Calories",
    value: avgKcal != null ? `${nf(Math.round(avgKcal), 0)} kcal` : "Rien de logué",
    sub: [
      `${completeDays.length}/${NUTRITION_WINDOW_DAYS} j complets`,
      partialDays > 0 ? `${partialDays} partiel${partialDays > 1 ? "s" : ""}` : null,
      kcalTarget ? `cible ${nf(kcalTarget, 0)}` : null,
      avgProtein != null && proteinTarget ? `prot. ${nf(Math.round(avgProtein), 0)}/${nf(proteinTarget, 0)} g` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    tone: nutritionTone,
  });

  // Séances : 4 semaines glissantes, aujourd'hui inclus.
  const trainFrom = addDaysIso(today, -(TRAINING_WINDOW_DAYS - 1));
  const sessionDays = new Set(input.sessionDates.map((d) => d.slice(0, 10)).filter((d) => d >= trainFrom && d <= today));
  const perWeek = sessionDays.size / (TRAINING_WINDOW_DAYS / 7);
  const planned = input.targets.sessionsPerWeek && input.targets.sessionsPerWeek > 0 ? input.targets.sessionsPerWeek : null;
  const trainingTone: PilotTone = planned
    ? perWeek / planned >= 0.85
      ? "ok"
      : perWeek / planned >= 0.5
      ? "warn"
      : "bad"
    : "info";
  tiles.push({
    key: "training",
    label: "Séances",
    value: `${nf(perWeek, 1)}/sem`,
    sub: `${plural(sessionDays.size, "séance", "séances")} sur 4 sem. · ${planned ? `prévu ${planned}/sem` : "aucun plan défini"}`,
    tone: trainingTone,
  });

  // Sommeil : 14 dernières nuits. Repère 8 h pour un ado (recommandation
  // AASM 8 à 10 h entre 13 et 18 ans), 7 h pour un adulte.
  const sleepFrom = addDaysIso(today, -(SLEEP_WINDOW_DAYS - 1));
  const nights = inWindow(input.sleep, sleepFrom, today).filter((s) => s.hours > 0);
  const sleepRef = input.age != null && input.age < 18 ? 8 : 7;
  const sleepAvg = nights.length ? nights.reduce((s, n) => s + n.hours, 0) / nights.length : null;
  tiles.push({
    key: "sleep",
    label: "Sommeil",
    value: sleepAvg != null ? `${nf(sleepAvg, 1)} h` : "Pas de donnée",
    sub:
      nights.length >= 4
        ? `moy. sur ${nights.length} nuits · repère ${sleepRef} h`
        : `${plural(nights.length, "nuit notée", "nuits notées")} sur 14 · repère ${sleepRef} h`,
    tone:
      sleepAvg == null || nights.length < 4
        ? "info"
        : sleepAvg >= sleepRef
        ? "ok"
        : sleepAvg >= sleepRef - 1
        ? "warn"
        : "bad",
  });

  // ── Repère de décharge ──────────────────────────────────────────────────────
  // Deux phases ne peuvent pas se chevaucher (lib/roadmap-validation.ts), donc
  // un deload se planifie comme une phase à part : on compte les semaines
  // depuis la fin du dernier deload/dévolume (ou depuis le début de la phase
  // en cours s'il n'y en a jamais eu). Rien si le programme actif gère déjà
  // ses décharges (mésocycle, voir lib/mesocycle.ts).
  let deloadHint: PhasePilot["deloadHint"] = null;
  if (active && TRAINING_BLOCK_TYPES.has(active.type) && !input.programHasMesocycle) {
    const nextDeload = phases.find((p) => DELOAD_TYPES.has(p.type) && p.start_date > today);
    const lastDeload = last(phases.filter((p) => DELOAD_TYPES.has(p.type) && p.end_date < today));
    const since = lastDeload ? maxIso(addDaysIso(lastDeload.end_date, 1), active.start_date) : active.start_date;
    const weeksWithout = Math.floor(diffDaysIso(since, today) / 7) + 1;
    const nextIn = nextDeload ? diffDaysIso(today, nextDeload.start_date) : null;
    if (nextDeload && nextIn != null && nextIn <= 28) {
      deloadHint = { tone: "info", text: `${nextDeload.label || "Deload"} prévu dans ${plural(nextIn, "jour", "jours")}.` };
    } else if (weeksWithout >= 6) {
      deloadHint = {
        tone: weeksWithout > 10 ? "warn" : "info",
        text: `Semaine ${weeksWithout} sans deload sur ${self ? "ta" : "sa"} road map : repère courant, un allègement toutes les 6 à 10 semaines.`,
      };
    }
  }

  // ── Actions utiles (uniquement sur sa propre road map) ─────────────────────
  const ctas: PhasePilot["ctas"] = [];
  if (self) {
    if (!weightTrend || weightTrend.fragile) ctas.push({ key: "bilan", label: "Me peser au bilan" });
    if (nutritionTone !== "ok") ctas.push({ key: "nutrition", label: "Loguer mes repas" });
    if (trainingTone === "warn" || trainingTone === "bad") ctas.push({ key: "logbook", label: "Ouvrir le logbook" });
  }

  // ── Titre court ─────────────────────────────────────────────────────────────
  const headline = active
    ? `${phaseName}, semaine ${weekIndex} sur ${totalWeeks}`
    : status === "before"
    ? "Road map pas encore démarrée"
    : status === "after"
    ? "Road map terminée"
    : "Entre deux phases";

  // Poids de départ pour la vraie progression des objectifs de poids : même
  // règle que checkWeightObjectiveAchievements (utils/roadmap.ts), la
  // dernière pesée à ou avant le début de la road map, sinon la première.
  const beforeStart = last(weights.filter((w) => w.date <= roadmap.start_date));
  const roadmapStartKg = beforeStart?.kg ?? weights[0]?.kg ?? null;

  return {
    today,
    perspective,
    status,
    headline,
    roadmapWeek,
    roadmapTotalWeeks,
    activePhase: active ? { ...active, colors: colorsFor(active.type) } : null,
    weekIndex,
    totalWeeks,
    daysLeftInPhase,
    phaseProgressPct,
    nextPhase,
    competition,
    corridor,
    weightTrend,
    weightSeries: series,
    verdict,
    tiles,
    deloadHint,
    ctas,
    weights: { latest, roadmapStartKg },
  };
}
