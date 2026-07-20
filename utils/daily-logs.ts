import { createServerSupabase } from "@/lib/supabase-server";
import type { DailyLog } from "@/lib/daily-logs-helpers";

export type { DailyLog, WeeklyAverages } from "@/lib/daily-logs-helpers";
export { computeWeeklyAverages, groupLogsByWeek } from "@/lib/daily-logs-helpers";

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
