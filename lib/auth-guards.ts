"use server";

/**
 * Security guards for server actions.
 * Always call these at the top of any server action that mutates data.
 */

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isStrongSession } from "@/lib/mfa";

export type GuardResult =
  | { ok: true; userId: string; role: "coach" | "client" }
  | { ok: false; error: string };

/** Verify the user is authenticated AND has role="coach" */
export async function requireCoach(): Promise<GuardResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Non authentifié." };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "coach") {
      return { ok: false, error: "Accès réservé au coach." };
    }
    return { ok: true, userId: user.id, role: "coach" };
  } catch {
    return { ok: false, error: "Erreur d'authentification." };
  }
}

/**
 * Verify the user is authenticated, has role="coach", AND is the coach
 * assigned to the given client (multi-coach isolation — a coach must
 * never be able to read/write another coach's client through a guessed
 * or crafted clientId).
 */
export async function requireOwnClient(clientId: string): Promise<GuardResult> {
  const guard = await requireCoach();
  if (!guard.ok) return guard;

  try {
    const admin = createAdminClient();
    const { data: client } = await admin
      .from("profiles")
      .select("coach_id")
      .eq("id", clientId)
      .single();

    if (!client || client.coach_id !== guard.userId) {
      return { ok: false, error: "Accès non autorisé à ce client." };
    }
    return guard;
  } catch {
    return { ok: false, error: "Erreur d'authentification." };
  }
}

/**
 * Comme requireOwnClient, mais autorise aussi le coach à agir sur SES
 * PROPRES données (clientId === son propre id) — plusieurs écrans "Moi"
 * du coach (profil, nutrition, photos/compétition) réutilisent les mêmes
 * server actions que la fiche client, avec clientId = l'id du coach.
 */
export async function requireOwnClientOrSelf(clientId: string): Promise<GuardResult> {
  const guard = await requireCoach();
  if (!guard.ok) return guard;
  if (clientId === guard.userId) return guard;

  try {
    const admin = createAdminClient();
    const { data: client } = await admin
      .from("profiles")
      .select("coach_id")
      .eq("id", clientId)
      .single();

    if (!client || client.coach_id !== guard.userId) {
      return { ok: false, error: "Accès non autorisé à ce client." };
    }
    return guard;
  } catch {
    return { ok: false, error: "Erreur d'authentification." };
  }
}

/**
 * Verify the user is authenticated AND is "client-capable" : soit un vrai
 * compte role="client", soit un coach qui est lui-même suivi par un autre
 * coach (double rôle — coach_id renseigné sur un profil role="coach").
 */
export async function requireClient(): Promise<GuardResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Non authentifié." };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role, coach_id")
      .eq("id", user.id)
      .single();

    const isClientCapable =
      profile?.role === "client" || (profile?.role === "coach" && !!profile?.coach_id);
    if (!isClientCapable) {
      return { ok: false, error: "Accès réservé au client." };
    }
    return { ok: true, userId: user.id, role: profile!.role as "coach" | "client" };
  } catch {
    return { ok: false, error: "Erreur d'authentification." };
  }
}

/**
 * Verify the user is authenticated AND is the platform owner (EP Coaching)
 * — pour les écrans d'administration multi-coach (jamais pour un coach tiers).
 */
export async function requirePlatformOwner(): Promise<GuardResult> {
  const guard = await requireCoach();
  if (!guard.ok) return guard;

  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_platform_owner, mfa_enabled")
      .eq("id", guard.userId)
      .single();

    if (!profile?.is_platform_owner) {
      return { ok: false, error: "Accès réservé au propriétaire de la plateforme." };
    }

    // Les écrans du fondateur sont déjà protégés par le layout du dashboard,
    // mais une server action reste appelable directement : quelqu'un qui aurait
    // seulement le mot de passe pourrait la déclencher sans jamais passer par
    // le code à 6 chiffres. Dès que la 2FA est active sur le compte, on exige
    // donc aussi une session forte ici.
    if (profile.mfa_enabled === true) {
      const supabase = await createServerSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isStrongSession(session?.access_token)) {
        return { ok: false, error: "Double authentification requise pour cette action." };
      }
    }

    return guard;
  } catch {
    return { ok: false, error: "Erreur d'authentification." };
  }
}

/** Verify the user is authenticated (any role) */
export async function requireAuth(): Promise<GuardResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Non authentifié." };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role as "coach" | "client" | undefined;
    if (!role) return { ok: false, error: "Profil introuvable." };

    return { ok: true, userId: user.id, role };
  } catch {
    return { ok: false, error: "Erreur d'authentification." };
  }
}
