import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function getUser() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export interface Profile {
  id: string;
  role: "coach" | "client";
  full_name: string | null;
  email: string | null;
  phone: string | null;
  start_date: string | null;
  weight_start: number | null;
  goal: string | null;
  status: "active" | "paused" | "ended";
  // Competition / photo fields
  competition_category: string | null;
  competition_date: string | null;
  photo_frequency: "weekly" | "daily";
  subscription_status: "free" | "active" | "canceled";
  subscription_plan: string | null;
  level: string | null;
  source: string | null;
}

const PROFILE_FIELDS =
  "id, role, full_name, email, phone, start_date, weight_start, goal, status, competition_category, competition_date, photo_frequency, subscription_status, subscription_plan, level, source";

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("id", userId)
      .single();
    return (data as Profile) ?? null;
  } catch {
    return null;
  }
}

export async function getClients(): Promise<Profile[]> {
  try {
    // Use admin client to bypass RLS — coach must see ALL clients regardless of policies.
    // Only paying clients show up here — free community members are managed
    // separately (see getCommunityMembers) since the coach has no oversight on them.
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("role", "client")
      .eq("subscription_status", "active")
      .order("full_name");
    return (data as Profile[]) ?? [];
  } catch {
    return [];
  }
}

export async function getCommunityMembers(): Promise<Profile[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("role", "client")
      .neq("subscription_status", "active")
      .order("start_date", { ascending: false });
    return (data as Profile[]) ?? [];
  } catch {
    return [];
  }
}

export async function getClientById(id: string): Promise<Profile | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("id", id)
      .eq("role", "client")
      .single();
    return (data as Profile) ?? null;
  } catch {
    return null;
  }
}

export function isSubscribed(profile: Profile | null): boolean {
  return profile?.subscription_status === "active";
}

export async function getUserRole(
  userId: string
): Promise<"coach" | "client" | null> {
  const profile = await getProfile(userId);
  return profile?.role ?? null;
}
