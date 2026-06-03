"use server";

/**
 * Security guards for server actions.
 * Always call these at the top of any server action that mutates data.
 */

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

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

/** Verify the user is authenticated AND has role="client" */
export async function requireClient(): Promise<GuardResult> {
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

    if (profile?.role !== "client") {
      return { ok: false, error: "Accès réservé au client." };
    }
    return { ok: true, userId: user.id, role: "client" };
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
