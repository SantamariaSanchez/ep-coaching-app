"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { todayInParis } from "@/lib/dates";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getLoginLock, registerFailedLogin, clearLoginAttempts } from "@/lib/login-throttle";
import { isPasswordPwned, PWNED_PASSWORD_MESSAGE } from "@/lib/pwned-password";
import { cleanText, escapeHtml, LIMITS } from "@/lib/sanitize";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { notifyAdmin } from "@/lib/admin-notify";
import { getRoleCard, isStaffRoleKey } from "@/lib/staff-roles";
import { STAFF_TERMS_VERSION } from "@/lib/staff-contract";
import { sendStaffVerificationEmail } from "@/lib/staff";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function callerIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "inconnu";
  } catch {
    return "inconnu";
  }
}

type Admin = ReturnType<typeof createAdminClient>;

async function findOpenInvite(admin: Admin, roleKey: string, email: string) {
  const { data } = await admin
    .from("staff_invites")
    .select("id, owner_id, application_id")
    .eq("role_key", roleKey)
    .eq("email", email)
    .is("used_at", null)
    .maybeSingle();
  return data as { id: string; owner_id: string; application_id: string | null } | null;
}

// Rattache un compte à son invitation : crée la ligne staff_members (seule
// source d'accès à l'espace équipe) et consomme l'invitation.
async function claimInvite(
  admin: Admin,
  invite: { id: string; owner_id: string; application_id: string | null },
  userId: string,
  roleKey: string,
  fullName: string,
  email: string,
  termsAccepted: boolean
): Promise<string | null> {
  const now = new Date().toISOString();
  const { error } = await admin.from("staff_members").insert({
    user_id: userId,
    owner_id: invite.owner_id,
    role_key: roleKey,
    full_name: fullName,
    email,
    application_id: invite.application_id,
    terms_accepted_at: termsAccepted ? now : null,
    terms_version: termsAccepted ? STAFF_TERMS_VERSION : null,
  });
  if (error) return error.message;
  await admin.from("staff_invites").update({ used_at: now, used_by: userId }).eq("id", invite.id);
  return null;
}

export async function loginStaff(
  roleKey: string,
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  if (!isStaffRoleKey(roleKey)) return { error: "Poste inconnu." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email et mot de passe requis." };

  const locked = await getLoginLock(email);
  if (locked) return { error: locked };

  const supabase = await createServerSupabase();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !authData.user) {
    const nowLocked = await registerFailedLogin(email);
    return { error: nowLocked ?? "Identifiants incorrects." };
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("staff_members")
    .select("status")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!member) {
    // Compte déjà existant ailleurs dans l'appli (ex : membre de la
    // communauté) mais recruté entre temps : on le rattache si une
    // invitation l'attend pour CE poste.
    const invite = await findOpenInvite(admin, roleKey, email);
    if (!invite) {
      await supabase.auth.signOut();
      return { error: "Ce compte n'a pas d'accès équipe pour ce poste. Si tu viens d'être recruté, utilise l'onglet Première connexion avec l'email de ta candidature." };
    }
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", authData.user.id).maybeSingle();
    const claimError = await claimInvite(admin, invite, authData.user.id, roleKey, (profile?.full_name as string) || email, email, false);
    if (claimError) {
      await supabase.auth.signOut();
      return { error: "Impossible d'activer ton accès équipe pour le moment, réessaie plus tard." };
    }
  } else if (member.status !== "actif") {
    await supabase.auth.signOut();
    return { error: "Ton accès équipe n'est plus actif. Contacte EP Coaching si c'est une erreur." };
  }

  await clearLoginAttempts(email);
  redirect("/equipe");
}

export interface StaffSignupInput {
  roleKey: string;
  fullName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
}

// Première connexion d'une recrue : l'email doit correspondre à une
// invitation ouverte pour CE poste (candidature acceptée ou email autorisé à
// la main par le fondateur). Sans invitation, aucun compte n'est créé.
export async function signupStaff(input: StaffSignupInput): Promise<{ error: string } | never> {
  const roleKey = input.roleKey;
  if (!isStaffRoleKey(roleKey)) return { error: "Poste inconnu." };

  const fullName = cleanText(input.fullName, LIMITS.name);
  const email = cleanText(input.email, LIMITS.shortText)?.toLowerCase();
  const password = input.password;

  if (!fullName || !email || typeof password !== "string" || password.length < 8) {
    return { error: "Nom, email et mot de passe (8 caractères minimum) requis." };
  }
  if (password.length > 200) return { error: "Mot de passe trop long (200 caractères max)." };
  if (!EMAIL_RE.test(email)) return { error: "Adresse email invalide." };
  if (!input.acceptedTerms) {
    return { error: "Tu dois accepter les Conditions de collaboration et la politique de confidentialité." };
  }

  const ip = await callerIp();
  const limit = await checkRateLimit(`signup-staff:${ip}`, PRESETS.signup.limit, PRESETS.signup.windowSeconds);
  if (!limit.allowed) return { error: "Trop de tentatives. Réessaie dans un moment." };

  const admin = createAdminClient();
  const invite = await findOpenInvite(admin, roleKey, email);
  if (!invite) {
    return {
      error: "Cet email n'est pas autorisé pour ce poste. Utilise l'email de ta candidature, ou demande à EP Coaching de l'autoriser.",
    };
  }

  if (await isPasswordPwned(password)) return { error: PWNED_PASSWORD_MESSAGE };

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    const msg = (authError?.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
      return { error: "Un compte existe déjà avec cet email. Utilise l'onglet Me connecter avec ton mot de passe habituel." };
    }
    return { error: "Erreur de création du compte. Réessaie." };
  }
  const userId = authData.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    role: "staff",
    full_name: fullName,
    email,
    status: "active",
    start_date: todayInParis(),
    is_platform_owner: false,
    email_verified_at: null,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "L'espace équipe n'est pas encore activé côté base de données. Préviens EP Coaching." };
  }

  const claimError = await claimInvite(admin, invite, userId, roleKey, fullName, email, true);
  if (claimError) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return { error: "Impossible d'activer ton accès équipe pour le moment, réessaie plus tard." };
  }

  const supabase = await createServerSupabase();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { error: "Accès créé, mais la connexion automatique a échoué. Utilise l'onglet Me connecter." };

  sendStaffVerificationEmail(email, fullName, roleKey).catch(() => {});
  notifyAdmin("Nouvelle recrue connectée", [
    `<strong>${escapeHtml(fullName)}</strong> (${escapeHtml(email)})`,
    `Poste : ${escapeHtml(getRoleCard(roleKey)?.role.title ?? roleKey)}`,
    "Prochaine étape de son côté : confirmer son email puis signer son contrat.",
  ]).catch(() => {});

  redirect("/equipe");
}
