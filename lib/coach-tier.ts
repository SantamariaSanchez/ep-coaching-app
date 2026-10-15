import { cache } from "react";
import { createAdminClient } from "@/lib/supabase-admin";

// Formule d'un coach (voir supabase/migrations/20261015_coach_platform_plan.sql).
// Standard 20 € : le suivi des clients. Premium 200 € : en plus la création
// de contenu, les 5 formations, les lives et l'IA. Le fondateur, les coachs
// en accès gratuit (testeurs) et les comptes antérieurs gardent tout.
export type CoachTier = "standard" | "premium";

export const getCoachTier = cache(async function getCoachTier(userId: string): Promise<CoachTier> {
  try {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("role, is_platform_owner, platform_plan")
      .eq("id", userId)
      .maybeSingle();
    const p = data as { role: string | null; is_platform_owner: boolean | null; platform_plan: string | null } | null;
    if (!p || p.role !== "coach" || p.is_platform_owner) return "premium";
    return p.platform_plan === "standard" ? "standard" : "premium";
  } catch {
    return "premium";
  }
});

/** Rubriques coach réservées à Premium (segments de /dashboard/coach). */
export const PREMIUM_COACH_SEGMENTS = [
  "studio",
  "stats-reseaux",
  "positionnement",
  "business",
  "masterclass",
  "formations",
  "mon-equipe",
  "mailing",
  "compta",
  "admin/ventes",
  "live",
  "assistant",
  "claude",
  "moi/formations",
] as const;

export function isPremiumSegment(segment: string): boolean {
  return PREMIUM_COACH_SEGMENTS.some((s) => segment === s || segment.startsWith(`${s}/`));
}
