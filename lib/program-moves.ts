// Décalage d'une séance du programme. Calculs purs, partagés par le serveur
// (utils/program-moves.ts, app/actions/program-moves.ts) et l'affichage.
//   « à chaque semaine » : program_days.weekday change (le modèle).
//   « juste cette semaine » : une ligne program_day_moves (séance, lundi de la
//   semaine, jour) remplace le weekday du modèle pour cette semaine seulement.

export interface DayMove {
  day_id: string;
  weekday: number;
}

/** Applique les décalages de la semaine : le jour effectif remplace celui du modèle. */
export function applyWeekMoves<D extends { id: string; weekday?: number | null; weekMoved?: boolean }>(
  days: D[],
  moves: DayMove[]
): D[] {
  if (moves.length === 0) return days;
  const byDay = new Map(moves.map((m) => [m.day_id, m.weekday]));
  return days.map((d) => {
    const wd = byDay.get(d.id);
    return wd && wd !== d.weekday ? { ...d, weekday: wd, weekMoved: true } : d;
  });
}

export function isValidWeekday(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 7;
}
