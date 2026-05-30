import { createServerSupabase } from "@/lib/supabase-server";

export interface CheckIn {
  id: string;
  client_id: string;
  week_number: number;
  week_start: string;
  created_at: string;
  weight: number | null;
  weight_avg: number | null;
  nutrition_adherence: number | null;
  calories_per_day: number | null;
  steps_per_day: number | null;
  sleep_hours: number | null;
  hrv: number | null;
  resting_hr: number | null;
  digestion: number | null;
  general_feeling: number | null;
  client_notes: string | null;
  coach_notes: string | null;
  coach_rating: number | null;
  coach_replied_at: string | null;
  // Bilan system
  bilan_text: string | null;
  bilan_rating: number | null;
  bilan_sent_at: string | null;
  // Monthly measurements
  includes_measurements: boolean | null;
}

export interface CheckInWithClient extends CheckIn {
  profiles: { full_name: string | null } | null;
}

export interface CheckInWithClientProfile extends CheckIn {
  profiles: { full_name: string | null; email: string | null } | null;
}

export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export function getISOWeek(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function getThisWeekCheckin(clientId: string): Promise<CheckIn | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("check_ins")
      .select("*")
      .eq("client_id", clientId)
      .eq("week_start", getWeekStart())
      .maybeSingle();
    return (data as CheckIn) ?? null;
  } catch {
    return null;
  }
}

export async function getClientCheckins(clientId: string): Promise<CheckIn[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("check_ins")
      .select("*")
      .eq("client_id", clientId)
      .order("week_start", { ascending: false });
    return (data as CheckIn[]) ?? [];
  } catch {
    return [];
  }
}

export async function getClientPastCheckins(clientId: string): Promise<CheckIn[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("check_ins")
      .select("*")
      .eq("client_id", clientId)
      .lt("week_start", getWeekStart())
      .order("week_start", { ascending: false });
    return (data as CheckIn[]) ?? [];
  } catch {
    return [];
  }
}

export async function getWeeklyCheckinCount(): Promise<number> {
  try {
    const supabase = await createServerSupabase();
    const weekStart = getWeekStart();
    const { count } = await supabase
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .gte("week_start", weekStart);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getPendingReplies(): Promise<CheckInWithClient[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("check_ins")
      .select("*, profiles:client_id(full_name)")
      .is("coach_replied_at", null)
      .order("created_at", { ascending: false })
      .limit(10);
    return (data as CheckInWithClient[]) ?? [];
  } catch {
    return [];
  }
}

// ── Bilan system ──────────────────────────────────────────────────────────────

export async function getPendingBilans(): Promise<CheckInWithClientProfile[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("check_ins")
      .select("*, profiles:client_id(full_name, email)")
      .is("bilan_sent_at", null)
      .order("created_at", { ascending: false });
    return (data as CheckInWithClientProfile[]) ?? [];
  } catch {
    return [];
  }
}

export async function getDoneBilans(): Promise<CheckInWithClientProfile[]> {
  try {
    const supabase = await createServerSupabase();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data } = await supabase
      .from("check_ins")
      .select("*, profiles:client_id(full_name, email)")
      .not("bilan_sent_at", "is", null)
      .gte("bilan_sent_at", thirtyDaysAgo.toISOString())
      .order("bilan_sent_at", { ascending: false });
    return (data as CheckInWithClientProfile[]) ?? [];
  } catch {
    return [];
  }
}

export async function getPendingBilansCount(): Promise<number> {
  try {
    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .is("bilan_sent_at", null);
    return count ?? 0;
  } catch {
    return 0;
  }
}
