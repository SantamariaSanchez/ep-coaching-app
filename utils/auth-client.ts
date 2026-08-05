// Helpers purs et synchrones, sans aucune dépendance à "next/headers" ou
// supabase-server — sûrs à importer depuis un Client Component ("use client").
// utils/auth.ts réexporte tout ce fichier pour que les appelants côté serveur
// continuent d'importer Profile/roleBadge/etc. depuis "@/utils/auth" comme
// avant. Un Client Component qui a besoin d'un de ces éléments doit en
// revanche importer directement depuis "@/utils/auth-client" : importer
// depuis "@/utils/auth" tire aussi createServerSupabase (next/headers), ce
// que Turbopack refuse de bundler pour le navigateur (voir NotificationBell).

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
  instagram_handle: string | null;
  next_billing_date: string | null;
  external_payment_link: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  // Date à laquelle la personne a cliqué sur le lien de confirmation envoyé
  // par email. null = email jamais vérifié (bandeau affiché dans le dashboard).
  email_verified_at: string | null;
}

export function isSubscribed(profile: Profile | null): boolean {
  return profile?.subscription_status === "active";
}

// Un compte peut être coach ET client d'un autre coach (double rôle) : un
// profil role='coach' avec coach_id renseigné accède aussi à l'espace
// /dashboard/client/* pour son propre suivi personnel. Source unique de
// vérité pour ce calcul, utilisée par le middleware et les guards serveur.
export function isClientCapable(
  profile: Pick<Profile, "role" | "coach_id"> | null | undefined
): boolean {
  if (!profile) return false;
  if (profile.role === "client") return true;
  return profile.role === "coach" && !!profile.coach_id;
}

export type RoleBadge = "Fondateur" | "Coach" | "Premium" | "Membre gratuit";

// Single source of truth for how a member's status is displayed app-wide:
// fondateur -> "Fondateur", coach tiers -> "Coach", paying client ->
// "Premium", everyone else (free community member) -> "Membre gratuit".
export function roleBadge(
  profile: Pick<Profile, "role" | "subscription_status" | "is_platform_owner"> | null | undefined
): RoleBadge {
  if (!profile) return "Membre gratuit";
  if (profile.is_platform_owner) return "Fondateur";
  if (profile.role === "coach") return "Coach";
  if (profile.subscription_status === "active") return "Premium";
  return "Membre gratuit";
}
