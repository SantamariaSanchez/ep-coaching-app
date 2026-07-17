import type { DailyLog } from "@/utils/daily-logs";

export interface ObservedTdee {
  tdee: number;
  avgCalories: number;
  weightChangeKg: number;
  days: number;
}

const KCAL_PER_KG_FAT = 7700;

// TDEE "réel", déduit du bilan quotidien (poids + calories loggées) plutôt
// que de la formule Mifflin-St Jeor seule — celle-ci ne bouge jamais tant
// que personne ne retouche le formulaire à la main, même quand le poids
// réel dérive dans un sens ou l'autre.
export function computeObservedTdee(dailyLogs: DailyLog[]): ObservedTdee | null {
  const usable = dailyLogs
    .filter((l) => l.weight_morning != null && l.calories_kcal != null)
    .sort((a, b) => a.log_date.localeCompare(b.log_date));

  // Sous ce seuil, la tendance de poids est trop bruitée (rétention d'eau,
  // etc.) pour en tirer une estimation fiable.
  if (usable.length < 7) return null;

  const third = Math.max(2, Math.floor(usable.length / 3));
  const firstChunk = usable.slice(0, third);
  const lastChunk = usable.slice(-third);

  const avg = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length;
  const firstWeight = avg(firstChunk.map((l) => l.weight_morning!));
  const lastWeight = avg(lastChunk.map((l) => l.weight_morning!));
  const avgCalories = avg(usable.map((l) => l.calories_kcal!));

  const firstMid = new Date(firstChunk[Math.floor(firstChunk.length / 2)].log_date).getTime();
  const lastMid = new Date(lastChunk[Math.floor(lastChunk.length / 2)].log_date).getTime();
  const days = Math.round((lastMid - firstMid) / 86400000);

  if (days < 5) return null;

  const weightChangeKg = lastWeight - firstWeight;
  const dailyImbalance = (weightChangeKg * KCAL_PER_KG_FAT) / days;
  const tdee = Math.round(avgCalories - dailyImbalance);

  return { tdee, avgCalories: Math.round(avgCalories), weightChangeKg: Math.round(weightChangeKg * 10) / 10, days };
}
