// Blocs liés (2026-10-20) : un bloc séance ouvre la séance du jour du
// programme, un bloc repas ouvre le repas de la diète. Le lien se résout à
// l'affichage, jamais figé dans le bloc : si le programme ou la diète
// changent (autre jour, autres aliments), le bloc pointe toujours vers ce
// qui est prévu maintenant. Fichier sans import serveur.

import { DAY_KEYS, blockKind, mealSlotOf, type BlockLike } from "@/lib/agenda-engine";

export interface AgendaExercise {
  name: string;
  sets: number | null;
  reps: string | null;
  rest: number | null;
  notes: string | null;
  equipment: string | null;
}

export interface AgendaSession {
  id: string;
  label: string;
  weekday: number | null;
  notes: string | null;
  muscleGroups: string[];
  exercises: AgendaExercise[];
  /** Accessoires à prévoir (ceinture, sangles...), voir lib/session-accessories. */
  accessories: string[];
}

export interface AgendaMealItem {
  name: string;
  grams: number;
  kcal: number;
  proteins: number;
}

export interface AgendaContext {
  programId: string | null;
  programName: string | null;
  sessions: AgendaSession[];
  /** Salle déclarée dans la fiche (intake), si connue. */
  gymName: string | null;
  diet: {
    name: string;
    structure: "daily" | "weekly";
    /** Clé "all" (structure quotidienne) ou "lun".."dim" -> créneau -> aliments. */
    meals: Record<string, Record<string, AgendaMealItem[]>>;
  } | null;
}

export const EMPTY_CONTEXT: AgendaContext = { programId: null, programName: null, sessions: [], gymName: null, diet: null };

/** Créneaux de repas prévus par la diète tel jour (1..7). */
export function dietSlotsForDay(ctx: AgendaContext, day: number): string[] {
  if (!ctx.diet) return [];
  const key = ctx.diet.structure === "weekly" ? DAY_KEYS[day] : "all";
  return Object.keys(ctx.diet.meals[key] ?? {});
}

export function mealItemsFor(ctx: AgendaContext, day: number, slot: string): AgendaMealItem[] {
  if (!ctx.diet) return [];
  const key = ctx.diet.structure === "weekly" ? DAY_KEYS[day] : "all";
  return ctx.diet.meals[key]?.[slot] ?? [];
}

/** Séance du programme prévue tel jour (jour fixé par le programme). */
export function sessionForDay(ctx: AgendaContext, day: number): AgendaSession | null {
  return ctx.sessions.find((s) => s.weekday === day) ?? null;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^s[eé]ance\s*:?\s*/i, "")
    .trim();
}

/**
 * Séance liée à un bloc : d'abord la séance du programme fixée ce jour-là
 * (le programme fait foi), sinon celle dont le nom correspond au bloc.
 * `moved` signale un bloc qui ne correspond plus au programme (séance
 * déplacée à un autre jour).
 */
export function resolveSession(ctx: AgendaContext, block: BlockLike, day = block.day_of_week): { session: AgendaSession | null; moved: boolean } {
  const byDay = sessionForDay(ctx, day);
  const wanted = norm(block.link_ref || block.label);
  const byName = ctx.sessions.find((s) => norm(s.label) === wanted || (wanted && norm(s.label).includes(wanted)) || (wanted && wanted.includes(norm(s.label)))) ?? null;
  if (byDay) return { session: byDay, moved: false };
  if (byName) return { session: byName, moved: byName.weekday != null && byName.weekday !== day };
  return { session: null, moved: false };
}

export function linkedKind(block: BlockLike): "seance" | "repas" | "trajet" | null {
  const k = blockKind(block);
  return k === "seance" || k === "repas" || k === "trajet" ? k : null;
}

export { mealSlotOf };
