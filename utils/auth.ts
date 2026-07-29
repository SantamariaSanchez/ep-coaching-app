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
  // Multi-coach : à quel coach ce client est rattaché (null = pas encore
  // attribué). Pour un profil role="coach", identifie le compte d'origine
  // EP Coaching (exempté d'abonnement plateforme, seul à garder la
  // Communauté) et son statut d'abonnement à la plateforme elle-même.
  coach_id: string | null;
  is_platform_owner: boolean;
  platform_subscription_status: "inactive" | "active" | "canceled";
  platform_stripe_customer_id: string | null;
  platform_stripe_subscription_id: string | null;
  invite_code: string | null;
}

const PROFILE_FIELDS =
  "id, role, full_name, email, phone, start_date, weight_start, goal, status, competition_category, competition_date, photo_frequency, season_mode, subscription_status, subscription_plan, level, source, bio, avatar_url, onboarding_completed_at, checkin_day, coach_id, is_platform_owner, platform_subscription_status, platform_stripe_customer_id, platform_stripe_subscription_id, invite_code";

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

// Multi-coach : chaque coach ne voit que SES propres clients, jamais ceux
// d'un autre coach (y compris le propriétaire de la plateforme). coachId
// doit toujours être l'id du coach connecté — jamais une valeur déduite
// d'un input utilisateur.
export async function getClients(coachId: string): Promise<Profile[]> {
  try {
    // Use admin client to bypass RLS — coach must see ALL of their own
    // clients regardless of policies. Only paying clients show up here —
    // free community members are managed separately (see getCommunityMembers).
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("role", "client")
      .eq("coach_id", coachId)
      .eq("subscription_status", "active")
      .order("full_name");
    return (data as Profile[]) ?? [];
  } catch {
    return [];
  }
}

// Total de membres inscrits chez CE coach (clients payants + communauté
// gratuite), tous statuts confondus — sert de repère de croissance sur le
// dashboard coach, distinct de getClients() qui ne compte que les payants actifs.
export async function getTotalMembersCount(coachId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "client")
      .eq("coach_id", coachId);
    return count ?? 0;
  } catch {
    return 0;
  }
}

// Le coach doit pouvoir écrire à n'importe quel membre parmi les SIENS
// (clients payants et membres gratuits de sa communauté), pas seulement
// ses clients actifs — utilisé par la liste des messages coach.
export async function getAllMessageableMembers(coachId: string): Promise<Profile[]> {
  const [clients, communityMembers] = await Promise.all([
    getClients(coachId),
    getCommunityMembers(coachId),
  ]);
  return [...clients, ...communityMembers];
}

export async function getCommunityMembers(coachId: string): Promise<Profile[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("role", "client")
      .eq("coach_id", coachId)
      .neq("subscription_status", "active")
      .order("start_date", { ascending: false });
    return (data as Profile[]) ?? [];
  } catch {
    return [];
  }
}

// Renvoie le client uniquement s'il appartient bien à coachId — un coach ne
// doit jamais pouvoir lire la fiche d'un client qui n'est pas le sien, même
// en devinant/forgeant un id dans l'URL.
export async function getClientById(id: string, coachId: string): Promise<Profile | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("id", id)
      .eq("role", "client")
      .eq("coach_id", coachId)
      .single();
    return (data as Profile) ?? null;
  } catch {
    return null;
  }
}

// Réservé aux jobs système (cron) qui doivent agir sur tous les clients de
// la plateforme, tous coachs confondus (ex. rappels programmés) — ne JAMAIS
// utiliser cette fonction dans une page ou action déclenchée par un coach.
export async function getAllActiveClientsSystemWide(): Promise<Profile[]> {
  try {
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

export function isSubscribed(profile: Profile | null): boolean {
  return profile?.subscription_status === "active";
}

// Réservé au propriétaire de la plateforme (is_platform_owner) — liste tous
// les coachs tiers pour la gestion de leur abonnement plateforme. Ne JAMAIS
// exposer à un coach normal : ce n'est pas cloisonné par coach_id, par nature.
export async function getAllCoaches(): Promise<Profile[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("role", "coach")
      .eq("is_platform_owner", false)
      .order("full_name");
    return (data as Profile[]) ?? [];
  } catch {
    return [];
  }
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
