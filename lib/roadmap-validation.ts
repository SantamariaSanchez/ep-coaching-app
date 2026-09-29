// Validation d'une road map avant écriture, partagée par l'éditeur
// (components/roadmap/RoadmapEditor.tsx, avant d'appeler l'API) et par la
// route POST (app/api/roadmap/[clientId]/route.ts, qui ne fait jamais
// confiance au client).
//
// Pourquoi : deux phases qui se chevauchaient étaient enregistrées sans un
// mot, puis le calendrier (getPhaseForDate) ne montrait que la première et
// l'autre disparaissait silencieusement de la frise. Les erreurs bloquent
// l'enregistrement, les avertissements s'affichent sans bloquer.
//
// On ne valide qu'à l'ÉCRITURE : une road map déjà en base qui ne passerait
// pas ces règles reste lisible telle quelle.
//
// Module pur (aucun import serveur).

import { MAX_ROADMAP_WEEKS, countRoadmapWeeks, formatIsoFr, isValidIsoDate, minIso } from "@/lib/roadmap-weeks";

export interface RoadmapValidationPhase {
  type: string;
  label: string;
  start_date: string;
  end_date: string;
  notes?: string | null;
}

export interface RoadmapValidationObjective {
  label: string;
  target_date: string;
  term: string;
  description?: string | null;
  target_unit?: string | null;
}

export interface RoadmapValidationInput {
  start_date: string;
  end_date: string;
  phases: RoadmapValidationPhase[];
  objectives: RoadmapValidationObjective[];
}

export interface RoadmapValidationResult {
  errors: string[];
  warnings: string[];
}

// Bornes alignées sur les contraintes posées en base
// (supabase/migrations/20260805k_input_hardening_constraints.sql) : mieux vaut
// un message clair ici qu'un "Erreur lors de l'ajout des phases" générique.
const LABEL_MAX = 200;
const TEXT_MAX = 2000;
const UNIT_MAX = 40;
const MAX_PHASES = 60;
const MAX_OBJECTIVES = 100;
const TERMS = new Set(["short", "medium", "long"]);

function fmt(iso: string): string {
  return formatIsoFr(iso, { day: "numeric", month: "short", year: "numeric" });
}

function phaseName(p: RoadmapValidationPhase, index: number): string {
  const label = p.label?.trim();
  return label ? `phase ${index + 1} (${label})` : `phase ${index + 1}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function validateRoadmapInput(input: RoadmapValidationInput): RoadmapValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { start_date: start, end_date: end, phases, objectives } = input;
  const periodOk = isValidIsoDate(start) && isValidIsoDate(end);

  if (!periodOk) {
    errors.push("Renseigne des dates de début et de fin valides pour la road map.");
  } else if (end < start) {
    errors.push("La date de fin de la road map est avant sa date de début.");
  } else if (countRoadmapWeeks(start, end) > MAX_ROADMAP_WEEKS) {
    errors.push("La road map dépasse 10 ans : vérifie l'année de tes dates.");
  }

  if (phases.length > MAX_PHASES) errors.push(`Maximum ${MAX_PHASES} phases par road map.`);
  if (objectives.length > MAX_OBJECTIVES) errors.push(`Maximum ${MAX_OBJECTIVES} objectifs par road map.`);

  // ── Phases ────────────────────────────────────────────────────────────────
  const datedPhases: { p: RoadmapValidationPhase; index: number }[] = [];
  phases.forEach((p, index) => {
    const name = phaseName(p, index);
    if ((p.label ?? "").length > LABEL_MAX) errors.push(`${capitalize(name)} : le label dépasse ${LABEL_MAX} caractères.`);
    if ((p.notes ?? "").length > TEXT_MAX) errors.push(`${capitalize(name)} : les notes dépassent ${TEXT_MAX} caractères.`);
    if (!isValidIsoDate(p.start_date) || !isValidIsoDate(p.end_date)) {
      errors.push(`${capitalize(name)} : dates manquantes ou invalides.`);
      return;
    }
    if (p.end_date < p.start_date) {
      errors.push(`${capitalize(name)} : la fin est avant le début.`);
      return;
    }
    datedPhases.push({ p, index });
    if (periodOk && end >= start && (p.start_date < start || p.end_date > end)) {
      warnings.push(`${capitalize(name)} déborde de la période globale de la road map.`);
    }
  });

  // Chevauchements : tri par date de début, puis chaque phase est comparée à
  // celle (déjà vue) qui finit le plus tard. Les numéros affichés sont ceux
  // de l'éditeur ("Phase 2"), pas l'ordre trié.
  const sorted = [...datedPhases].sort((a, b) =>
    a.p.start_date === b.p.start_date ? a.index - b.index : a.p.start_date < b.p.start_date ? -1 : 1
  );
  let latest: { p: RoadmapValidationPhase; index: number } | null = null;
  for (const cur of sorted) {
    if (latest && cur.p.start_date <= latest.p.end_date) {
      const from = cur.p.start_date;
      const to = minIso(cur.p.end_date, latest.p.end_date);
      const [a, b] = [latest.index, cur.index].sort((x, y) => x - y);
      const when = from === to ? `le ${fmt(from)}` : `du ${fmt(from)} au ${fmt(to)}`;
      errors.push(`Les phases ${a + 1} et ${b + 1} se chevauchent ${when}.`);
    }
    if (!latest || cur.p.end_date > latest.p.end_date) latest = cur;
  }

  // ── Objectifs ─────────────────────────────────────────────────────────────
  objectives.forEach((o, index) => {
    const name = o.label?.trim() ? `L'objectif « ${o.label.trim()} »` : `L'objectif ${index + 1}`;
    if ((o.label ?? "").length > LABEL_MAX) errors.push(`${name} : le label dépasse ${LABEL_MAX} caractères.`);
    if ((o.description ?? "").length > TEXT_MAX) errors.push(`${name} : la description dépasse ${TEXT_MAX} caractères.`);
    if ((o.target_unit ?? "").length > UNIT_MAX) errors.push(`${name} : l'unité dépasse ${UNIT_MAX} caractères.`);
    if (!TERMS.has(o.term)) errors.push(`${name} : horizon invalide (court, moyen ou long terme).`);
    if (!isValidIsoDate(o.target_date)) {
      errors.push(`${name} : date cible manquante ou invalide.`);
      return;
    }
    if (periodOk && end >= start && (o.target_date < start || o.target_date > end)) {
      warnings.push(`${name} tombe hors de la période globale de la road map.`);
    }
  });

  return { errors, warnings };
}
