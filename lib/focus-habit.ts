// « Une seule chose à faire à la fois » : la première habitude du client,
// choisie parmi des habitudes à très faible friction, suivie sur 14 jours
// pour une victoire rapide (Mastermind, arrivée du client). Module pur,
// testé dans lib/__tests__/focus-habit.test.ts.

export const FOCUS_HABIT_DAYS = 14;

/** Habitudes proposées en premier : peu de friction, effet visible vite. */
export const FOCUS_HABIT_CANDIDATES = ["hydration_wake", "mobility", "bag_ready"] as const;

export interface FocusHabitProgress {
  /** Jour en cours, de 1 à FOCUS_HABIT_DAYS. */
  dayIndex: number;
  /** Jours distincts cochés depuis le départ. */
  daysDone: number;
  /** Les 14 jours sont écoulés : on célèbre et on propose la suite. */
  finished: boolean;
  /** Une case par jour : coché, manqué, ou pas encore arrivé. */
  cells: ("done" | "missed" | "future")[];
}

function dayDiff(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}

export function focusHabitProgress(since: string, today: string, doneDates: readonly string[]): FocusHabitProgress {
  const elapsed = Math.max(0, dayDiff(since, today));
  const done = new Set(doneDates);
  const cells: FocusHabitProgress["cells"] = [];
  let daysDone = 0;
  for (let i = 0; i < FOCUS_HABIT_DAYS; i++) {
    const date = addDays(since, i);
    if (done.has(date)) {
      cells.push("done");
      daysDone++;
    } else if (i < elapsed) {
      cells.push("missed");
    } else {
      cells.push("future");
    }
  }
  return {
    dayIndex: Math.min(FOCUS_HABIT_DAYS, elapsed + 1),
    daysDone,
    finished: elapsed >= FOCUS_HABIT_DAYS,
    cells,
  };
}
