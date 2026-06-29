import { createServerSupabase } from "@/lib/supabase-server";

export interface StepSettings {
  client_id: string;
  daily_goal: number;
}

export interface StepRoutineItem {
  id: string;
  client_id: string;
  label: string;
  time_label: string | null;
  position: number;
}

export interface StepLog {
  id: string;
  client_id: string;
  log_date: string;
  steps_actual: number;
  completed_items: string[];
}

export async function getStepSettings(clientId: string): Promise<StepSettings> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("step_settings")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();
    return (data as StepSettings) ?? { client_id: clientId, daily_goal: 8000 };
  } catch {
    return { client_id: clientId, daily_goal: 8000 };
  }
}

export async function getStepRoutineItems(clientId: string): Promise<StepRoutineItem[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("step_routine_items")
      .select("*")
      .eq("client_id", clientId)
      .order("position", { ascending: true });
    return (data as StepRoutineItem[]) ?? [];
  } catch {
    return [];
  }
}

export async function getStepLogs(clientId: string, days = 30): Promise<StepLog[]> {
  try {
    const supabase = await createServerSupabase();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data } = await supabase
      .from("step_logs")
      .select("*")
      .eq("client_id", clientId)
      .gte("log_date", since.toISOString().split("T")[0])
      .order("log_date", { ascending: false });
    return (data as StepLog[]) ?? [];
  } catch {
    return [];
  }
}
