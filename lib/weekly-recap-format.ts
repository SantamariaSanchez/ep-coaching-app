// Module volontairement sans aucun import (même discipline que lib/dates.ts) :
// la formulation du récap hebdo doit être importable telle quelle depuis un
// Client Component ("use client", AujourdhuiView.tsx) sans jamais entraîner
// createServerSupabase/next-headers dans le bundle navigateur. lib/weekly-recap.ts
// (le calcul, côté serveur) et le cron importent aussi ce fichier, pour ne
// garder qu'une seule formulation entre push et affichage en page.

export interface WeeklyRecapStats {
  sessions: number;
  /** Jours distincts avec au moins un repas logué, sur les 7 derniers jours. */
  foodDays: number;
  /** Delta de poids moyen vs la semaine précédente, en kg. Null si pas assez de données. */
  weightDeltaKg: number | null;
  avgWeight: number | null;
}

export function formatWeeklyRecapLine(stats: WeeklyRecapStats): string {
  const parts: string[] = [`${stats.sessions} séance${stats.sessions !== 1 ? "s" : ""}`];
  parts.push(`nutrition loguée ${stats.foodDays}/7 jours`);
  if (stats.weightDeltaKg != null && Math.abs(stats.weightDeltaKg) >= 0.1) {
    parts.push(`poids ${stats.weightDeltaKg > 0 ? "+" : ""}${stats.weightDeltaKg}kg sur la semaine`);
  } else if (stats.avgWeight != null) {
    parts.push("poids stable");
  }
  return parts.join(", ") + ".";
}
