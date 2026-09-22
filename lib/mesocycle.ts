// ── Périodisation de mésocycle (Axe FM, MASTERCLASS.md) ─────────────────
// Un mésocycle RP classique : montée progressive du volume de la semaine 1
// jusqu'à l'avant-dernière semaine (proche du plafond MRV visé), puis une
// semaine de décharge (~50% du volume) avant d'en démarrer un nouveau.
// Repère de calcul affiché au coach, jamais une réécriture automatique des
// séries du programme — même logique que VolumeBudgetReviewPanel/
// PositionCoveragePanel : informer, jamais décider à la place du coach.

export const MESOCYCLE_WEEKS_MIN = 2;
export const MESOCYCLE_WEEKS_MAX = 12;
export const DEFAULT_MESOCYCLE_WEEKS = 5;

export interface MesocycleStatus {
  /** 1-indexé, plafonné à totalWeeks même si la date de départ est plus ancienne. */
  currentWeek: number;
  totalWeeks: number;
  isDeloadWeek: boolean;
  /** Le mésocycle prévu est déjà terminé (currentWeek aurait dépassé totalWeeks) — signal pour en relancer un. */
  isOverdue: boolean;
  /** Multiplicateur (0-1) du volume cible plein (`programs.volume_targets`), à appliquer à titre indicatif pour cette semaine. */
  volumeFactor: number;
}

// Montée linéaire de 70% à 100% entre la semaine 1 et l'avant-dernière,
// puis 50% pour la dernière semaine (décharge). 70% de départ plutôt que
// MEV strict : un repère simple, pas une formule qui prétendrait calculer
// le MEV réel de CE client sans données pour le faire.
export function mesocycleVolumeFactor(week: number, totalWeeks: number): number {
  if (totalWeeks <= 1) return 1;
  if (week >= totalWeeks) return 0.5;
  if (totalWeeks === 2) return 1;
  const rampRatio = (week - 1) / (totalWeeks - 2);
  return 0.7 + 0.3 * Math.min(Math.max(rampRatio, 0), 1);
}

export function computeMesocycleStatus(
  startDateIso: string,
  totalWeeks: number,
  today: Date = new Date()
): MesocycleStatus {
  const start = new Date(`${startDateIso}T00:00:00`);
  const daysSince = Math.floor((today.getTime() - start.getTime()) / 86400000);
  const rawWeek = Math.floor(daysSince / 7) + 1;
  const isOverdue = rawWeek > totalWeeks;
  const currentWeek = Math.min(Math.max(rawWeek, 1), totalWeeks);
  return {
    currentWeek,
    totalWeeks,
    isDeloadWeek: currentWeek === totalWeeks,
    isOverdue,
    volumeFactor: mesocycleVolumeFactor(currentWeek, totalWeeks),
  };
}
