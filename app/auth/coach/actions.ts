"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { COACH_PLATFORM_PLANS } from "@/lib/coach-platform-plan";

export interface CoachSignupInput {
  fullName: string;
  email: string;
  password: string;
  planId: string;
}

export type CoachSignupResult = { error: string } | { success: true; checkoutUrl: string };

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 5);
}

// Inscription self-serve d'un coach tiers — crée le compte en attente
// (platform_subscription_status="inactive") puis redirige vers Stripe pour
// l'abonnement plateforme ; le webhook Stripe active le compte une fois le
// paiement confirmé (voir app/api/webhooks/stripe/route.ts). Tant que le
// paiement n'est pas passé, /dashboard/coach reste bloqué (voir page.tsx).
export async function signupCoach(input: CoachSignupInput): Promise<CoachSignupResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!fullName || !email || password.length < 6) {
    return { error: "Nom, email et mot de passe (6 caractères min.) requis." };
  }

  const plan = COACH_PLATFORM_PLANS.find((p) => p.id === input.planId);
  if (!plan) return { error: "Formule invalide." };

  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "";
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
      return { error: "Cet email est déjà utilisé." };
    }
    return { error: "Erreur création du compte. Réessaie." };
  }

  // Petite retry sur le code d'invitation en cas de collision improbable.
  let profileError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await admin.from("profiles").insert({
      id: authData.user.id,
      role: "coach",
      full_name: fullName,
      email,
      status: "active",
      start_date: new Date().toISOString().split("T")[0],
      is_platform_owner: false,
      platform_subscription_status: "inactive",
      invite_code: generateInviteCode(),
    });
    profileError = error;
    if (!error || !error.message.includes("invite_code")) break;
  }

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: "Erreur création profil : " + profileError.message };
  }

  const supabase = await createServerSupabase();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { error: "Compte créé mais connexion automatique impossible, connecte-toi manuellement." };
  }

  const checkoutUrl = `${plan.url}?client_reference_id=${authData.user.id}`;
  return { success: true, checkoutUrl };
}

export async function loginCoach(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createServerSupabase();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !authData.user) {
    return { error: "Identifiants incorrects." };
  }

  // Verify role with admin client (bypasses RLS)
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profile?.role !== "coach") {
    // Sign out — not a coach
    await supabase.auth.signOut();
    return { error: "Accès non autorisé. Ce compte n'est pas un compte coach." };
  }

  redirect("/dashboard/coach");
}
