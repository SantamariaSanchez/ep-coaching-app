import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";
import { isMissingTable } from "@/lib/steps-sync";

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
  // Migration 20261014g_steps_auto_sync : origine du chiffre et heure de la
  // dernière synchro. Absents tant que la migration n'est pas passée.
  source?: string | null;
  synced_at?: string | null;
}

export interface StepsSyncStatus {
  /** La table step_sync_tokens existe (migration appliquée). */
  available: boolean;
  hasToken: boolean;
  hint: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
  lastSource: string | null;
}

const NO_SYNC: StepsSyncStatus = { available: false, hasToken: false, hint: null, createdAt: null, lastUsedAt: null, lastSource: null };

// Clé de synchro automatique (Raccourci iOS, Health Connect) : lue avec la
// clé service, la table n'a volontairement aucune policy côté navigateur.
export async function getStepsSyncStatus(userId: string): Promise<StepsSyncStatus> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("step_sync_tokens")
      .select("token_hint, created_at, last_used_at, last_source")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return isMissingTable(error) ? NO_SYNC : { ...NO_SYNC, available: true };
    const row = data as { token_hint: string; created_at: string; last_used_at: string | null; last_source: string | null } | null;
    if (!row) return { ...NO_SYNC, available: true };
    return { available: true, hasToken: true, hint: row.token_hint, createdAt: row.created_at, lastUsedAt: row.last_used_at, lastSource: row.last_source };
  } catch {
    return NO_SYNC;
  }
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

// Juste le total du jour — utilisé par le bilan quotidien pour pré-remplir
// son propre champ "Pas dans la journée" plutôt que de faire retaper à la
// main un chiffre que le podomètre (ou une saisie déjà faite dans Pas &
// routine) a déjà. Une requête dédiée à une ligne plutôt que de tirer
// getStepLogs(clientId, 30) juste pour filtrer sur aujourd'hui.
export async function getTodayStepsActual(clientId: string): Promise<number | null> {
  try {
    const supabase = await createServerSupabase();
    const today = todayInParis();
    const { data } = await supabase
      .from("step_logs")
      .select("steps_actual")
      .eq("client_id", clientId)
      .eq("log_date", today)
      .maybeSingle();
    return (data as { steps_actual: number } | null)?.steps_actual ?? null;
  } catch {
    return null;
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
