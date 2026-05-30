import { createServerSupabase } from "@/lib/supabase-server";
import type { SubmissionType } from "@/lib/posing-data";

export interface PhotoUpdate {
  id: string;
  client_id: string;
  submitted_at: string;
  week_number: number | null;
  type: SubmissionType;
  category: string;
  drive_link: string;
  notes: string | null;
  coach_feedback: string | null;
  coach_replied_at: string | null;
  created_at: string;
}

export interface PhotoUpdateWithClient extends PhotoUpdate {
  profiles: { full_name: string | null; email: string | null } | null;
}

// ── Client queries ─────────────────────────────────────────────────────────────

export async function getClientPhotoUpdates(
  clientId: string,
  limit = 20
): Promise<PhotoUpdate[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("photo_updates")
      .select("*")
      .eq("client_id", clientId)
      .order("submitted_at", { ascending: false })
      .limit(limit);
    return (data as PhotoUpdate[]) ?? [];
  } catch {
    return [];
  }
}

export async function getThisWeekPhotoUpdate(
  clientId: string
): Promise<PhotoUpdate | null> {
  try {
    const supabase = await createServerSupabase();
    // Get Monday of current week
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    const mondayStr = monday.toISOString().split("T")[0];

    const { data } = await supabase
      .from("photo_updates")
      .select("*")
      .eq("client_id", clientId)
      .gte("submitted_at", mondayStr)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as PhotoUpdate) ?? null;
  } catch {
    return null;
  }
}

export async function getTodayPhotoUpdate(
  clientId: string
): Promise<PhotoUpdate | null> {
  try {
    const supabase = await createServerSupabase();
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("photo_updates")
      .select("*")
      .eq("client_id", clientId)
      .eq("submitted_at", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as PhotoUpdate) ?? null;
  } catch {
    return null;
  }
}

// ── Coach queries ─────────────────────────────────────────────────────────────

export async function getPendingPhotoUpdates(): Promise<PhotoUpdateWithClient[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("photo_updates")
      .select("*, profiles(full_name, email)")
      .is("coach_replied_at", null)
      .order("created_at", { ascending: true });
    return (data as PhotoUpdateWithClient[]) ?? [];
  } catch {
    return [];
  }
}

export async function getPendingPhotoUpdatesCount(): Promise<number> {
  try {
    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from("photo_updates")
      .select("*", { count: "exact", head: true })
      .is("coach_replied_at", null);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getAllClientPhotoUpdates(
  clientId: string
): Promise<PhotoUpdate[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("photo_updates")
      .select("*")
      .eq("client_id", clientId)
      .order("submitted_at", { ascending: false });
    return (data as PhotoUpdate[]) ?? [];
  } catch {
    return [];
  }
}
