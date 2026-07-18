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
  season_mode: "off_season" | "prep" | null;
  subscription_status: "free" | "active" | "canceled";
  subscription_plan: string | null;
  level: string | null;
  source: string | null;
  bio: string | null;
  avatar_url: string | null;
  onboarding_completed_at: string | null;
  // Jour de check-in hebdo fixe : 1 = lundi ... 7 = dimanche.
  checkin_day: number;
}

const PROFILE_FIELDS =
  "id, role, full_name, email, phone, start_date, weight_start, goal, status, competition_category, competition_date, photo_frequency, season_mode, subscription_status, subscription_plan, level, source, bio, avatar_url, onboarding_completed_at, checkin_day";

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

// Total de membres inscrits (clients payants + communauté gratuite), tous
// statuts confondus — sert de repère de croissance sur le dashboard coach,
// distinct de getClients() qui ne compte que les clients payants actifs.
export async function getTotalMembersCount(): Promise<number> {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "client");
    return count ?? 0;
  } catch {
    return 0;
  }
}

// Le coach doit pouvoir écrire à n'importe quel membre (clients payants
// et membres gratuits de la communauté), pas seulement à ses clients actifs —
// utilisé par la liste des messages coach.
export async function getAllMessageableMembers(): Promise<Profile[]> {
  const [clients, communityMembers] = await Promise.all([
    getClients(),
    getCommunityMembers(),
  ]);
  return [...clients, ...communityMembers];
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

export type RoleBadge = "Coach" | "Premium" | "Membre gratuit";

// Single source of truth for how a member's status is displayed app-wide:
// coach -> "Coach", paying client -> "Premium", everyone else (free
// community member) -> "Membre gratuit".
export function roleBadge(
  profile: Pick<Profile, "role" | "subscription_status"> | null | undefined
): RoleBadge {
  if (!profile) return "Membre gratuit";
  if (profile.role === "coach") return "Coach";
  if (profile.subscription_status === "active") return "Premium";
  return "Membre gratuit";
}

export async function getUserRole(
  userId: string
): Promise<"coach" | "client" | null> {
  const profile = await getProfile(userId);
  return profile?.role ?? null;
}
