// Types + fonctions pures (aucun import serveur) extraits de utils/daily-logs.ts
// pour que les composants client (ex. ClientProfileTabs.tsx) puissent
// importer groupLogsByWeek/computeWeeklyAverages sans entraîner
// createServerSupabase (next/headers) dans le bundle navigateur, ce qui
// casse le build Next.js.

export interface DailyLog {
  id: string;
  client_id: string;
  log_date: string;
  // Programme
  training_name: string | null;
  training_rating: number | null;
  cardio: string | null;
  // Lifestyle
  steps: number | null;
  weight_morning: number | null;
  weight_time: string | null;
  sleep_hours: number | null;
  sleep_rating: number | null;
  // Heures réelles de coucher/lever, à comparer à profiles.target_bedtime /
  // target_wake_time pour la régularité — voir lib/daily-gate.ts.
  bedtime_actual: string | null;
  wake_time_actual: string | null;
  digestion: string | null;
  stress: "low" | "medium" | "high" | null;
  // Nutrition
  proteins_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  calories_kcal: number | null;
  hunger: "low" | "medium" | "high" | null;
  // Meta
  created_at: string;
  updated_at: string;
}

export interface WeeklyAverages {
  weight: number | null;
  sleep_hours: number | null;
  sleep_rating: number | null;
  steps: number | null;
  calories_kcal: number | null;
  proteins_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  training_rating: number | null;
  // Échelles low/medium/high converties en 1-3 pour être moyennées — 1 =
  // bas, 3 = haut (donc pour le stress, plus proche de 3 = plus stressé).
  stress: number | null;
  hunger: number | null;
  // "Digestion" est un champ texte libre ("OK", "Ballonné"...), pas une
  // échelle : pas de moyenne numérique possible, juste la valeur la plus
  // fréquente sur la semaine + le nombre de jours renseignés.
  digestion_summary: { value: string; count: number } | null;
  daysLogged: number;
}

const TRI_SCALE: Record<string, number> = { low: 1, medium: 2, high: 3 };

export function computeWeeklyAverages(logs: DailyLog[]): WeeklyAverages {
  function avg(vals: (number | null)[]): number | null {
    const nums = vals.filter((v): v is number => v !== null);
    if (nums.length === 0) return null;
    return parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1));
  }
  function avgTriScale(vals: (string | null)[]): number | null {
    return avg(vals.map((v) => (v ? TRI_SCALE[v] ?? null : null)));
  }
  function mostCommon(vals: (string | null)[]): { value: string; count: number } | null {
    const counts = new Map<string, number>();
    for (const v of vals) {
      if (!v) continue;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    if (counts.size === 0) return null;
    const [value, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { value, count };
  }
  return {
    weight: avg(logs.map((l) => l.weight_morning)),
    sleep_hours: avg(logs.map((l) => l.sleep_hours)),
    sleep_rating: avg(logs.map((l) => l.sleep_rating)),
    steps: avg(logs.map((l) => l.steps ? Math.round(l.steps) : null)),
    calories_kcal: avg(logs.map((l) => l.calories_kcal)),
    proteins_g: avg(logs.map((l) => l.proteins_g)),
    carbs_g: avg(logs.map((l) => l.carbs_g)),
    fats_g: avg(logs.map((l) => l.fats_g)),
    training_rating: avg(logs.map((l) => l.training_rating)),
    stress: avgTriScale(logs.map((l) => l.stress)),
    hunger: avgTriScale(logs.map((l) => l.hunger)),
    digestion_summary: mostCommon(logs.map((l) => l.digestion)),
    daysLogged: logs.length,
  };
}

export function groupLogsByWeek(logs: DailyLog[]): {
  weekStart: string;
  logs: DailyLog[];
  averages: WeeklyAverages;
}[] {
  const weeks: Record<string, DailyLog[]> = {};

  for (const log of logs) {
    const d = new Date(log.log_date + "T12:00:00");
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const key = monday.toISOString().split("T")[0];
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(log);
  }

  return Object.entries(weeks)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekStart, wLogs]) => ({
      weekStart,
      logs: wLogs.sort((a, b) => a.log_date.localeCompare(b.log_date)),
      averages: computeWeeklyAverages(wLogs),
    }));
}
