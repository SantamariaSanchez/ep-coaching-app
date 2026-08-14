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

const MFA_REQUIRED_ERROR = "Double authentification requise pour cette action.";

/**
 * Force de session exigee pour AGIR, et pas seulement pour afficher une page.
 *
 * app/dashboard/layout.tsx bloque deja le rendu des pages tant que la session
 * n'est pas en aal2, mais une server action ou une route API reste appelable
 * directement, sans jamais charger la moindre page. Quelqu'un qui n'aurait que
 * le mot de passe d'un compte protege par 2FA pourrait donc agir sur ce compte
 * sans jamais fournir le code a 6 chiffres. Le controle vit donc ici, au plus
 * pres de l'action.
 *
 * Aucune obligation generale : on n'exige la session forte que si la 2FA est
 * reellement active sur CE compte. Un compte sans 2FA n'est pas impacte.
 * Echec ferme : session illisible, on refuse.
 */
async function hasRequiredSessionStrength(
  mfaEnabled: boolean | null | undefined
): Promise<boolean> {
  if (mfaEnabled !== true) return true;
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return isStrongSession(session?.access_token);
  } catch {
    return false;
  }
}

/** Verify the user is authenticated AND has role="coach" */
export async function requireCoach(): Promise<GuardResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Non authentifié." };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role, mfa_enabled")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "coach") {
      return { ok: false, error: "Accès réservé au coach." };
    }
    if (!(await hasRequiredSessionStrength(profile.mfa_enabled))) {
      return { ok: false, error: MFA_REQUIRED_ERROR };
    }
    return { ok: true, userId: user.id, role: "coach" };
  } catch (e) {
    console.error("requireCoach error:", e);
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
  } catch (e) {
    console.error("requireOwnClient error:", e);
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
  } catch (e) {
    console.error("requireOwnClientOrSelf error:", e);
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
      .select("role, coach_id, mfa_enabled")
      .eq("id", user.id)
      .single();

    const isClientCapable =
      profile?.role === "client" || (profile?.role === "coach" && !!profile?.coach_id);
    if (!isClientCapable) {
      return { ok: false, error: "Accès réservé au client." };
    }
    if (!(await hasRequiredSessionStrength(profile!.mfa_enabled))) {
      return { ok: false, error: MFA_REQUIRED_ERROR };
    }
    return { ok: true, userId: user.id, role: profile!.role as "coach" | "client" };
  } catch (e) {
    console.error("requireClient error:", e);
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

    // requireCoach() ci-dessus applique deja la meme regle ; on la garde ici
    // par defense en profondeur, ces ecrans donnant acces a tous les membres.
    if (!(await hasRequiredSessionStrength(profile.mfa_enabled))) {
      return { ok: false, error: MFA_REQUIRED_ERROR };
    }

    return guard;
  } catch (e) {
    console.error("requirePlatformOwner error:", e);
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
      .select("role, mfa_enabled")
      .eq("id", user.id)
      .single();

    const role = profile?.role as "coach" | "client" | undefined;
    if (!role) return { ok: false, error: "Profil introuvable." };

    if (!(await hasRequiredSessionStrength(profile!.mfa_enabled))) {
      return { ok: false, error: MFA_REQUIRED_ERROR };
    }
    return { ok: true, userId: user.id, role };
  } catch (e) {
    console.error("requireAuth error:", e);
    return { ok: false, error: "Erreur d'authentification." };
  }
}
