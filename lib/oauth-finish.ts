import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";
import { cleanText, escapeHtml, LIMITS } from "@/lib/sanitize";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { CGU_VERSION } from "@/lib/legal";
import { COACH_TESTER_PLAN } from "@/lib/coach-platform-plan";
import { notifyAdmin } from "@/lib/admin-notify";
import { sendVerificationEmail } from "@/lib/email-verification";
import { afterClientSignup, resolveCoachId, resolveReferrer } from "@/lib/client-signup-core";
import type { OAuthCtx, OAuthErrorCode } from "@/lib/oauth";
import { after } from "next/server";

// Fin de la connexion Google / Apple, côté serveur : la personne a une session
// Supabase, il reste à lui trouver (ou lui créer) son profil et son rôle, puis
// à choisir la bonne page d'arrivée.
//  - profil existant : on respecte son rôle (coach, équipe, client) ;
//  - premier passage depuis l'espace membre : profil « client », rattaché au
//    coach du code d'invitation (?coach=...) sinon au propriétaire de la
//    plateforme, comme l'inscription par e-mail ;
//  - premier passage depuis l'espace coach : profil « coach » en accès gratuit
//    (la formule payante se choisit ensuite dans l'appli).

export type OAuthFinishResult = { ok: true; redirect: string } | { ok: false; error: OAuthErrorCode };

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 5);
}

function displayName(user: User, email: string): string {
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  const raw =
    (typeof m.full_name === "string" && m.full_name) ||
    (typeof m.name === "string" && m.name) ||
    [m.given_name, m.family_name].filter((x) => typeof x === "string" && x).join(" ") ||
    email.split("@")[0].replace(/[._-]+/g, " ");
  const clean = cleanText(String(raw), LIMITS.name) ?? "";
  return clean || "Membre";
}

export async function completeOAuthUser(user: User, ctx: OAuthCtx, ip: string): Promise<OAuthFinishResult> {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id, role").eq("id", user.id).maybeSingle();

  if (profile) {
    if (ctx.role === "coach" && profile.role !== "coach") return { ok: false, error: "not_coach" };
    if (profile.role === "coach") return { ok: true, redirect: "/dashboard/coach" };
    if (profile.role === "staff") return { ok: true, redirect: "/equipe" };
    return { ok: true, redirect: "/dashboard/client" };
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    await admin.auth.admin.deleteUser(user.id);
    return { ok: false, error: "no_email" };
  }
  const limit = await checkRateLimit(`signup-oauth:${ip}`, PRESETS.signup.limit, PRESETS.signup.windowSeconds);
  if (!limit.allowed) {
    await admin.auth.admin.deleteUser(user.id);
    return { ok: false, error: "rate_limited" };
  }

  const fullName = displayName(user, email);
  const verifiedAt = user.email_confirmed_at ?? null;
  const nowIso = new Date().toISOString();

  if (ctx.role === "coach") {
    let error: { message: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await admin.from("profiles").insert({
        id: user.id,
        role: "coach",
        full_name: fullName,
        email,
        status: "active",
        start_date: todayInParis(),
        is_platform_owner: false,
        // Accès gratuit coach, comme l'inscription par e-mail (pas de Stripe).
        platform_subscription_status: "active",
        invite_code: generateInviteCode(),
        terms_accepted_at: nowIso,
        email_verified_at: verifiedAt,
      });
      error = res.error;
      if (!error || !error.message.includes("invite_code")) break;
    }
    if (error) {
      await admin.auth.admin.deleteUser(user.id);
      return { ok: false, error: "profile_failed" };
    }
    if (!verifiedAt) after(() => sendVerificationEmail(email, fullName).catch(() => {}));
    notifyAdmin("Nouvelle inscription coach tiers (Google ou Apple)", [
      `<strong>${escapeHtml(fullName)}</strong> (${escapeHtml(email)})`,
      `Formule : ${escapeHtml(COACH_TESTER_PLAN.label)}`,
    ], { url: "/dashboard/coach/admin" }).catch(() => {});
    return { ok: true, redirect: "/dashboard/coach" };
  }

  const coach = await resolveCoachId(admin, ctx.coach);
  const referrer = await resolveReferrer(admin, ctx.ref);
  const { error } = await admin.from("profiles").insert({
    id: user.id,
    role: "client",
    full_name: fullName,
    email,
    phone: null,
    status: "active",
    start_date: todayInParis(),
    coach_id: coach?.id ?? null,
    referred_by: referrer?.id ?? null,
    email_verified_at: verifiedAt,
    free_tier_started_at: nowIso,
    // L'acceptation est affichée sous les boutons (« En continuant, tu acceptes
    // les CGU… ») : horodatée avec la version, comme l'inscription par e-mail.
    cgu_accepted_at: nowIso,
    cgu_version: CGU_VERSION,
  });
  if (error) {
    await admin.auth.admin.deleteUser(user.id);
    return { ok: false, error: "profile_failed" };
  }
  await afterClientSignup({
    admin,
    userId: user.id,
    fullName,
    email,
    phone: null,
    coach,
    referrer,
    emailAlreadyVerified: !!verifiedAt,
  });
  return { ok: true, redirect: "/dashboard/client" };
}
