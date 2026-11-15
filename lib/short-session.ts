// Séance courte selon le temps réel (chantier C62, 2026-11-15) : « j'ai
// 30 minutes aujourd'hui ». Remplace le bouton « 2 séries max » par un vrai
// calcul : ce qui tient dans le temps dit, en gardant d'abord ce qui compte.
//
// Règles (lib/coaching-knowledge.ts et Base de connaissances Mastermind) :
// - la première série est la plus stimulante, chaque série suivante un peu
//   moins : on réduit les séries AVANT de retirer un exercice ;
// - l'ordre du programme dit la priorité (le coach met le principal en
//   premier), les mouvements polyarticulaires passent avant l'isolation ;
// - une séance courte vaut mieux qu'une séance sautée, sans culpabiliser ;
// - rien ne change dans le programme : seulement la séance d'aujourd'hui,
//   proposée, jamais appliquée sans que la personne touche « Appliquer » ;
// - les séries déjà faites ne sont jamais effacées.
//
// Fichier pur, client et serveur.

import { SESSION_TIME_RULES, restSecondsFor } from "@/lib/coaching-knowledge";

export interface ShortSessionExercise {
  key: string;
  name: string;
  /** Séries prévues restantes (pas encore validées). */
  remainingSets: number;
  /** Séries déjà validées dans cette séance. */
  doneSets: number;
  restSeconds: number | null;
  muscleGroup?: string | null;
}

export type ShortAction = "garder" | "reduire" | "retirer";

export interface ShortSessionLine {
  key: string;
  name: string;
  action: ShortAction;
  /** Séries restantes avant et après la proposition. */
  remainingBefore: number;
  remainingAfter: number;
}

export interface ShortSessionPlan {
  /** Minutes estimées pour finir la séance telle qu'elle est. */
  minutesBefore: number;
  /** Minutes estimées avec la proposition. */
  minutesAfter: number;
  fitsAlready: boolean;
  lines: ShortSessionLine[];
  /** Le temps est trop court même pour une seule série par exercice gardé. */
  tooShort: boolean;
}

/** Temps d'une série de travail (exécution), en minutes. */
const WORK_MINUTES = 0.75;
/** Changement d'exercice (installer la machine, les charges), en minutes. */
const TRANSITION_MINUTES = 1;

const COMPOUND = /(squat|presse|press|d[ée]velopp[ée]|bench|rowing|row\b|tirage|traction|pull[- ]?up|chin|soulev[ée]|deadlift|rdl|hip thrust|fente|lunge|dips|pompes?|push[- ]?up|hack|belt squat|good morning|militaire|overhead)/i;

export function isCompoundName(name: string): boolean {
  return COMPOUND.test(name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()) || COMPOUND.test(name);
}

function setMinutes(ex: ShortSessionExercise): number {
  const rest = ex.restSeconds && ex.restSeconds > 0 ? ex.restSeconds : restSecondsFor(isCompoundName(ex.name) ? "compound" : "isolation");
  return WORK_MINUTES + rest / 60;
}

function estimate(exs: ShortSessionExercise[], remaining: Map<string, number>): number {
  let total = 0;
  for (const ex of exs) {
    const n = remaining.get(ex.key) ?? 0;
    if (n <= 0) continue;
    total += TRANSITION_MINUTES + n * setMinutes(ex);
  }
  return Math.round(total);
}

/**
 * Propose de quoi finir dans `minutes`. Ordre des réductions :
 * 1. ramener chaque exercice à 2 séries au total, en partant de la fin ;
 * 2. retirer l'isolation en partant de la fin ;
 * 3. ramener à 1 série au total ce qui reste, en partant de la fin ;
 * 4. retirer les polyarticulaires en partant de la fin.
 * Le premier exercice qui reste à faire est toujours gardé.
 */
export function planShortSession(exercises: ShortSessionExercise[], minutes: number): ShortSessionPlan {
  const todo = exercises.filter((e) => e.remainingSets > 0);
  const remaining = new Map(todo.map((e) => [e.key, e.remainingSets]));
  const budget = Math.max(0, minutes);
  const minutesBefore = estimate(todo, remaining);
  const fits = () => estimate(todo, remaining) <= budget;
  const fitsAlready = minutesBefore <= budget;
  const protectedKey = todo[0]?.key;

  if (!fitsAlready) {
    const fromEnd = [...todo].reverse();
    // 1. Deux séries au total.
    for (const ex of fromEnd) {
      if (fits()) break;
      const allowed = Math.max(0, 2 - ex.doneSets);
      if ((remaining.get(ex.key) ?? 0) > allowed) remaining.set(ex.key, Math.max(ex.key === protectedKey ? 1 : 0, allowed));
    }
    // 2. Retirer l'isolation.
    for (const ex of fromEnd) {
      if (fits()) break;
      if (ex.key === protectedKey || isCompoundName(ex.name)) continue;
      remaining.set(ex.key, 0);
    }
    // 3. Une série au total.
    for (const ex of fromEnd) {
      if (fits()) break;
      const allowed = Math.max(ex.key === protectedKey ? 1 : 0, 1 - ex.doneSets);
      if ((remaining.get(ex.key) ?? 0) > allowed) remaining.set(ex.key, allowed);
    }
    // 4. Retirer les polyarticulaires.
    for (const ex of fromEnd) {
      if (fits()) break;
      if (ex.key === protectedKey) continue;
      remaining.set(ex.key, 0);
    }
  }

  const lines: ShortSessionLine[] = todo.map((ex) => {
    const after = remaining.get(ex.key) ?? 0;
    const action: ShortAction = after === ex.remainingSets ? "garder" : after === 0 && ex.doneSets === 0 ? "retirer" : "reduire";
    return { key: ex.key, name: ex.name, action, remainingBefore: ex.remainingSets, remainingAfter: after };
  });
  const minutesAfter = estimate(todo, remaining);
  return { minutesBefore, minutesAfter, fitsAlready, lines, tooShort: minutesAfter > budget };
}

/** Choix proposés à l'écran, en minutes. */
export const SHORT_SESSION_CHOICES = [15, 20, 30, 45, 60] as const;

/** Repère à afficher avec la proposition (enseignement du mentor, sans chiffre imposé). */
export const SHORT_SESSION_TIPS = [
  "Garde le même effort sur les séries qui restent : moins de séries, pas des séries plus faciles.",
  "Repos au bas de ta fourchette habituelle, sans le raccourcir à l'extrême sur les mouvements lourds.",
  "Une séance courte compte : elle vaut mieux qu'une séance sautée.",
];

export { SESSION_TIME_RULES };
