import { createServerSupabase } from "@/lib/supabase-server";

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

export async function getTodayLog(clientId: string): Promise<DailyLog | null> {
  try {
    const supabase = await createServerSupabase();
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("client_id", clientId)
      .eq("log_date", today)
      .maybeSingle();
    return (data as DailyLog) ?? null;
  } catch {
    return null;
  }
}

export async function getClientDailyLogs(
  clientId: string,
  days = 35
): Promise<DailyLog[]> {
  try {
    const supabase = await createServerSupabase();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("client_id", clientId)
      .gte("log_date", since.toISOString().split("T")[0])
      .order("log_date", { ascending: false });
    return (data as DailyLog[]) ?? [];
  } catch {
    return [];
  }
}

// Poids le plus récent réellement pesé (bilan quotidien) — le calculateur
// TDEE se pré-remplissait avec le poids de départ (weight_start, saisi une
// fois à l'onboarding) même des mois plus tard, ce qui faussait le calcul
// dès que le client avait pris ou perdu du poids depuis.
export async function getLatestWeight(clientId: string): Promise<number | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("daily_logs")
      .select("weight_morning")
      .eq("client_id", clientId)
      .not("weight_morning", "is", null)
      .order("log_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as { weight_morning: number | null } | null)?.weight_morning ?? null;
  } catch {
    return null;
  }
}

export async function getWeekDailyLogs(
  clientId: string,
  weekStart: string
): Promise<DailyLog[]> {
  try {
    const supabase = await createServerSupabase();
    const end = new Date(weekStart + "T12:00:00");
    end.setDate(end.getDate() + 6);
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("client_id", clientId)
      .gte("log_date", weekStart)
      .lte("log_date", end.toISOString().split("T")[0])
      .order("log_date", { ascending: true });
    return (data as DailyLog[]) ?? [];
  } catch {
    return [];
  }
}

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
