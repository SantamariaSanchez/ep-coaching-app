// Semaine d'entraînement « en un coup d'œil » pour la page Mon programme
// (retour direct du fondateur 2026-10-20 : « je suis censé voir ma prog et
// que ce soit mieux fait : qu'on voie bien le jour, l'heure, les
// accessoires, quelle salle et quels exos »). Calculs purs, partagés par le
// serveur (utils/program-week.ts) et l'affichage (ProgramWeekView).

import type { ProgramDay, Exercise } from "@/utils/programs";
import type { ScheduleBlock } from "@/utils/agenda";

export const WEEKDAY_SHORT = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const WEEKDAY_LONG = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const WEEKDAY_LETTER = ["", "L", "M", "M", "J", "V", "S", "D"];

// Même repère que le constructeur de programme (ClientContextPanel.SPORT_BLOCK) :
// un créneau d'agenda qui ressemble à de l'entraînement.
const SPORT_BLOCK = /(s[ée]ance|muscu|sport|training|entra[iî]n|salle|gym|push|pull|legs|full|haut|bas|upper|lower)/i;

function norm(v: string): string {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Lundi (YYYY-MM-DD) de la semaine de `todayIso`. */
export function weekStartOf(todayIso: string): string {
  const dow = new Date(`${todayIso}T12:00:00Z`).getUTCDay();
  const sinceMonday = dow === 0 ? 6 : dow - 1;
  const [y, m, d] = todayIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - sinceMonday)).toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Jour ISO (1 = lundi ... 7 = dimanche) d'une date YYYY-MM-DD. */
export function isoWeekday(iso: string): number {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return dow === 0 ? 7 : dow;
}

export interface DaySlot {
  start: string; // "HH:MM"
  end: string | null;
  /** Créneau tiré de l'agenda (bloc séance) plutôt que d'une simple étiquette. */
  label: string;
}

/**
 * Créneau d'agenda d'une séance du programme : un bloc de ce jour-là (ponctuel
 * cette semaine en priorité, sinon récurrent) dont le libellé reprend le nom
 * de la séance, sinon le premier bloc « entraînement » du jour.
 */
export function slotForDay(
  day: Pick<ProgramDay, "day_label" | "weekday">,
  blocks: ScheduleBlock[],
  weekStart: string
): DaySlot | null {
  if (!day.weekday) return null;
  const date = addDaysIso(weekStart, day.weekday - 1);
  const candidates = blocks.filter((b) =>
    b.specific_date
      ? b.specific_date === date
      : b.day_of_week === day.weekday && !(b.skipped_dates ?? []).includes(date)
  );
  if (candidates.length === 0) return null;
  const label = norm(day.day_label);
  const byName = candidates.filter((b) => {
    const bl = norm(b.label);
    return label.length > 1 && (bl.includes(label) || label.includes(bl));
  });
  const sport = candidates.filter((b) => SPORT_BLOCK.test(b.label));
  const pool = byName.length ? byName : sport;
  if (pool.length === 0) return null;
  // Ponctuel (déplacé cette semaine) avant récurrent, puis le plus tôt.
  const best = [...pool].sort(
    (a, b) => Number(!!b.specific_date) - Number(!!a.specific_date) || a.start_time.localeCompare(b.start_time)
  )[0];
  return { start: best.start_time.slice(0, 5), end: best.end_time ? best.end_time.slice(0, 5) : null, label: best.label };
}

/** Heure lisible « 18h » / « 18h30 ». */
export function shortHour(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  return `${parseInt(h, 10)}h${m && m !== "00" ? m : ""}`;
}

/**
 * Durée estimée d'une séance, en minutes arrondies à 5 : ~50 s d'effort par
 * série, le repos programmé (court entre deux exercices d'un même superset,
 * aucun après la toute dernière série) et ~2 min d'installation par
 * exercice (réglage de la machine, charges). Échauffement non compris.
 */
export function estimateMinutes(exercises: Exercise[]): number | null {
  if (exercises.length === 0) return null;
  let seconds = 0;
  exercises.forEach((ex, i) => {
    const sets = ex.sets ?? 3;
    const next = exercises[i + 1];
    const chained = !!ex.superset_group && next?.superset_group === ex.superset_group;
    const rest = chained ? 15 : ex.rest_seconds ?? 90;
    seconds += 120 + sets * 50 + Math.max(0, sets - (i === exercises.length - 1 ? 1 : 0)) * rest;
  });
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

/** Matériel de la séance (exercise_library.equipment), dédoublonné, sans « Autre ». */
export function equipmentForDay(exercises: Exercise[], equipmentByName: Record<string, string | null>): string[] {
  const seen = new Map<string, string>();
  for (const ex of exercises) {
    const eq = equipmentByName[norm(ex.name)];
    if (!eq || norm(eq) === "autre") continue;
    const key = norm(eq);
    if (!seen.has(key)) seen.set(key, eq);
  }
  return [...seen.values()];
}

export function equipmentKey(name: string): string {
  return norm(name);
}
