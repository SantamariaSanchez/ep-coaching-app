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
}

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
  return {
    weight: avg(logs.map((l) => l.weight_morning)),
    sleep_hours: avg(logs.map((l) => l.sleep_hours)),
    sleep_rating: avg(logs.map((l) => l.sleep_rating)),
    steps: avg(logs.map((l) => l.steps ? Math.round(l.steps) : null)),
    calories_kcal: avg(logs.map((l) => l.calories_kcal)),
    proteins_g: avg(logs.map((l) => l.proteins_g)),
    carbs_g: avg(logs.map((l) => l.carbs_g)),
    fats_g: avg(logs.map((l) => l.fats_g)),
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
