"use server";

import { todayInParis } from "@/lib/dates";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { COACH_PLATFORM_PLANS } from "@/lib/coach-platform-plan";
import { notifyAdmin } from "@/lib/admin-notify";
import { getLoginLock, registerFailedLogin, clearLoginAttempts } from "@/lib/login-throttle";
import { sendVerificationEmail } from "@/lib/email-verification";
import { isPasswordPwned, PWNED_PASSWORD_MESSAGE } from "@/lib/pwned-password";
import { cleanText, escapeHtml, LIMITS } from "@/lib/sanitize";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { headers } from "next/headers";

// Adresse IP de l'appelant, pour les quotas des actions publiques.
async function callerIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "inconnu";
  } catch {
    return "inconnu";
  }
}

export interface CoachSignupInput {
  fullName: string;
  email: string;
  password: string;
  planId: string;
  acceptedTerms: boolean;
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
  // Bornes appliquées côté serveur : le maxLength du formulaire ne protège de
  // rien contre une requête forgée directement vers cette server action.
  const fullName = cleanText(input.fullName, LIMITS.name);
  const email = cleanText(input.email, LIMITS.shortText)?.toLowerCase();
  const password = input.password;

  // Masterclass Axe P : 6 caractères minimum est un seuil trop faible
  // (référence courante NIST SP 800-63B : 8 minimum), même correction que
  // app/auth/client/actions.ts.
  if (!fullName || !email || typeof password !== "string" || password.length < 8) {
    return { error: "Nom, email et mot de passe (8 caractères min.) requis." };
  }
  if (password.length > 200) {
    return { error: "Mot de passe trop long (200 caractères max)." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Adresse email invalide." };
  }
  if (!input.acceptedTerms) {
    return { error: "Tu dois accepter les CGU et les CGV pour continuer." };
  }

  // Quota par adresse IP. Comme pour l'inscription client, on passe par
  // admin.auth.admin.createUser, qui ne consomme pas le rate limit natif de
  // Supabase Auth : sans ce garde fou, rien n'empêche de créer des comptes
  // coach en boucle.
  const ip = await callerIp();
  const signupLimit = await checkRateLimit(
    `signup-coach:${ip}`,
    PRESETS.signup.limit,
    PRESETS.signup.windowSeconds
  );
  if (!signupLimit.allowed) {
    return { error: "Trop de tentatives d'inscription. Réessaie dans un moment." };
  }

  // Refuse les mots de passe déjà présents dans une fuite publique connue.
  if (await isPasswordPwned(password)) {
    return { error: PWNED_PASSWORD_MESSAGE };
  }

  const plan = COACH_PLATFORM_PLANS.find((p) => p.id === input.planId);
  if (!plan) return { error: "Formule invalide." };

  const admin = createAdminClient();

  // email_confirm reste à true : le coach enchaîne immédiatement sur Stripe
  // sans attendre un email. La vérification réelle est suivie à part dans
  // profiles.email_verified_at. Voir lib/email-verification.ts.
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
      start_date: todayInParis(),
      is_platform_owner: false,
      platform_subscription_status: "inactive",
      invite_code: generateInviteCode(),
      terms_accepted_at: new Date().toISOString(),
      email_verified_at: null,
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

  // Email de confirmation en tâche de fond : le coach enchaîne directement sur
  // le paiement Stripe, il ne l'attend pas.
  sendVerificationEmail(email, fullName).catch(() => {});

  notifyAdmin("Nouvelle inscription coach tiers", [
    `<strong>${escapeHtml(fullName)}</strong> (${escapeHtml(email)})`,
    `Formule choisie : ${escapeHtml(plan.label)} (${escapeHtml(plan.priceLabel)})`,
  ]).catch(() => {});

  const checkoutUrl = `${plan.url}?client_reference_id=${authData.user.id}`;
  return { success: true, checkoutUrl };
}

export async function loginCoach(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = (formData.get("email") as string).trim();
  const password = formData.get("password") as string;

  // Verrouillage temporaire après plusieurs échecs sur le même email : évite
  // qu'un robot teste des mots de passe à l'infini.
  const locked = await getLoginLock(email);
  if (locked) return { error: locked };

  const supabase = await createServerSupabase();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !authData.user) {
    const nowLocked = await registerFailedLogin(email);
    return { error: nowLocked ?? "Identifiants incorrects." };
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

  await clearLoginAttempts(email);

  redirect("/dashboard/coach");
}
