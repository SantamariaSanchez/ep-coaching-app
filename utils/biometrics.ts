import { createServerSupabase } from "@/lib/supabase-server";

export interface BiometricLog {
  id: string;
  client_id: string;
  log_date: string;
  sleep_hours: number | null;
  readiness_score: number | null;
  hrv_ms: number | null;
  resting_hr: number | null;
  body_temp_deviation: number | null;
  activity_calories: number | null;
  source: "manual" | "oura";
}

export interface BiometricInsight {
  id: string;
  client_id: string;
  log_date: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  suggestion: string;
  acknowledged: boolean;
  created_at: string;
}

export async function getBiometricLogs(clientId: string, days = 30): Promise<BiometricLog[]> {
  try {
    const supabase = await createServerSupabase();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data } = await supabase
      .from("biometric_logs")
      .select("*")
      .eq("client_id", clientId)
      .gte("log_date", since.toISOString().split("T")[0])
      .order("log_date", { ascending: true });
    return (data as BiometricLog[]) ?? [];
  } catch {
    return [];
  }
}

export async function getBiometricInsights(clientId: string, limit = 15): Promise<BiometricInsight[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("biometric_insights")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as BiometricInsight[]) ?? [];
  } catch {
    return [];
  }
}
