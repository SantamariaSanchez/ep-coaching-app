"use server";

import { todayInParis } from "@/lib/dates";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";
import { notifyAdmin } from "@/lib/admin-notify";
import { notifyUser } from "@/lib/notify";
import { getLoginLock, registerFailedLogin, clearLoginAttempts } from "@/lib/login-throttle";
import { awardPoints } from "@/lib/gamification";
import { POINTS } from "@/lib/gamification-types";
import { sendVerificationEmail } from "@/lib/email-verification";
import { isPasswordPwned, PWNED_PASSWORD_MESSAGE } from "@/lib/pwned-password";
import { cleanText, escapeHtml, LIMITS } from "@/lib/sanitize";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { maybeSendAICoachWelcome } from "@/lib/ai-coach-welcome";
import { CGU_VERSION } from "@/lib/legal";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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

export interface RequestState {
  success?: boolean;
  error?: string;
  message?: string;
}

export interface SelfSignupInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  // Code d'invitation du coach dont ce nouveau membre est le client
  // (partagé par le coach, ex. lien /auth/client?coach=CODE). Absent ou
  // invalide → rattachement au propriétaire de la plateforme (EP Coaching).
  inviteCode?: string;
  // Item 41 : code de PARRAINAGE d'un membre/client (distinct du code
  // coach ci-dessus), ex. /auth/client?ref=CODE — ne change jamais le
  // coach attribué, sert uniquement à créditer le parrain.
  refCode?: string;
  // Acceptation explicite des CGU/CGV/politique de confidentialité, cochée au
  // formulaire. Revérifiée ici : une requête forgée contourne trivialement la
  // case côté navigateur, et c'est justement cette acceptation qu'on doit
  // pouvoir prouver plus tard (profiles.cgu_accepted_at).
  acceptedTerms?: boolean;
}

// Résout un éventuel parrain — n'importe quel profil (coach ou pas), pas
// filtré par role contrairement à resolveCoachId ci-dessous.
async function resolveReferrer(
  admin: ReturnType<typeof createAdminClient>,
  refCode: string | undefined
): Promise<{ id: string; full_name: string | null } | null> {
  if (!refCode) return null;
  const { data } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("referral_code", refCode)
    .maybeSingle();
  return data ?? null;
}

export type SelfSignupResult = { error: string } | { success: true; userId: string };

// Repère un compte auth.users existant pour cet email qui n'a jamais reçu de
// ligne profiles (inscription précédente interrompue entre la création du
// compte et l'insert du profil). Un tel compte fait échouer toute nouvelle
// tentative de la même personne avec "email déjà utilisé" sans que le
// prospect n'ait jamais pu réellement rejoindre l'app — vécu en prod le
// 2026-08-05. listUsers() plutôt qu'une requête directe sur auth.users : le
// schéma auth n'est pas exposé via PostgREST, seule l'API admin GoTrue l'est.
async function findOrphanAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<{ id: string } | null> {
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const match = data?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!match) return null;
    const { data: profile } = await admin.from("profiles").select("id").eq("id", match.id).maybeSingle();
    return profile ? null : { id: match.id };
  } catch {
    return null;
  }
}

// Résout quel coach doit récupérer ce nouveau membre : le titulaire du code
// d'invitation s'il est valide et a un abonnement plateforme actif, sinon
// le propriétaire historique de la plateforme (comportement d'origine).
async function resolveCoachId(
  admin: ReturnType<typeof createAdminClient>,
  inviteCode: string | undefined
): Promise<{ id: string; email: string | null; full_name: string | null } | null> {
  if (inviteCode) {
    const { data: invited } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "coach")
      .eq("invite_code", inviteCode)
      .eq("platform_subscription_status", "active")
      .maybeSingle();
    if (invited) return invited;
  }

  const { data: owner } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "coach")
    .eq("is_platform_owner", true)
    .maybeSingle();
  return owner ?? null;
}

// Self-serve signup — anyone can join the free community on their own.
// Coaching access is unlocked separately via Stripe (see /dashboard/client/abonnement).
export async function selfSignup(input: SelfSignupInput): Promise<SelfSignupResult> {
  // Bornes appliquées côté serveur : le maxLength du formulaire ne protège de
  // rien contre une requête forgée directement vers cette server action.
  const fullName = cleanText(input.fullName, LIMITS.name);
  const email = cleanText(input.email, LIMITS.shortText)?.toLowerCase();
  const phone = cleanText(input.phone, LIMITS.phone);
  const password = input.password;

  // Masterclass Axe P : 6 caractères minimum est un seuil trop faible
  // (référence courante NIST SP 800-63B : 8 minimum). Le vrai rempart reste
  // le contrôle isPasswordPwned ci-dessous, mais un plancher de longueur
  // trop bas laisse passer des mots de passe triviaux jamais présents dans
  // une fuite connue ("azerty1", 7 caractères) sans que rien ne les bloque.
  if (!fullName || !email || !phone || typeof password !== "string" || password.length < 8) {
    return { error: "Nom, email, téléphone et mot de passe (8 caractères min.) requis." };
  }
  if (password.length > 200) {
    return { error: "Mot de passe trop long (200 caractères max)." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Adresse email invalide." };
  }
  if (input.acceptedTerms !== true) {
    return { error: "Tu dois accepter les conditions d'utilisation pour créer ton compte." };
  }

  // Quota par adresse IP. Attention : cette inscription passe par
  // admin.auth.admin.createUser, qui est une API d'administration et ne
  // consomme donc PAS le rate limit natif de Supabase Auth. Sans le quota
  // ci dessous, on peut créer des comptes en boucle, et chaque création
  // déclenche deux emails (coach + fondateur).
  const ip = await callerIp();
  const signupLimit = await checkRateLimit(
    `signup-client:${ip}`,
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

  const admin = createAdminClient();

  const coach = await resolveCoachId(admin, input.inviteCode);
  const referrer = await resolveReferrer(admin, input.refCode);

  // email_confirm reste à true : le compte est utilisable immédiatement, la
  // personne n'attend pas un email pour entrer. La vérification réelle est
  // suivie à part dans profiles.email_verified_at (null ici), avec un email de
  // confirmation envoyé en tâche de fond juste après. Voir
  // lib/email-verification.ts.
  let { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "";
    const alreadyExists = msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists");
    if (alreadyExists) {
      // Un compte auth peut exister sans profil (inscription précédente
      // interrompue avant l'insert, ou rollback qui a échoué en silence) :
      // dans ce cas précis, la personne ne peut jamais rejoindre, on l'a
      // vécu en prod. On répare au lieu de bloquer indéfiniment un vrai
      // prospect derrière un compte fantôme.
      const orphan = await findOrphanAuthUserByEmail(admin, email);
      if (orphan) {
        await admin.auth.admin.deleteUser(orphan.id);
        const retry = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        authData = retry.data;
        authError = retry.error;
      }
    }
    if (authError || !authData?.user) {
      if (alreadyExists) {
        return { error: "Cet email est déjà utilisé. Utilise l'onglet Me connecter." };
      }
      return { error: "Erreur création du compte. Réessaie." };
    }
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    role: "client",
    full_name: fullName,
    email,
    phone,
    status: "active",
    start_date: todayInParis(),
    coach_id: coach?.id ?? null,
    referred_by: referrer?.id ?? null,
    email_verified_at: null,
    // Point de départ des 60 jours gratuits (voir lib/free-tier.ts) et trace de
    // l'acceptation des conditions, horodatée avec la version acceptée pour
    // rester opposable si les CGU évoluent ensuite.
    free_tier_started_at: new Date().toISOString(),
    cgu_accepted_at: new Date().toISOString(),
    cgu_version: CGU_VERSION,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: "Erreur création profil : " + profileError.message };
  }

  // Sign in on the request-bound client so the session cookie is set.
  const supabase = await createServerSupabase();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { error: "Compte créé mais connexion automatique impossible, connecte-toi manuellement." };
  }

  // Email de confirmation en tâche de fond : l'écran d'inscription ne l'attend
  // pas, le membre enchaîne directement sur son espace.
  sendVerificationEmail(email, fullName).catch(() => {});

  if (coach?.email) {
    try {
      await sendBrevoEmail({
        to: coach.email,
        subject: `Nouveau membre communauté - ${fullName}`,
        htmlContent: `<div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
          <h2 style="color:#E01E1E;margin-top:0;">Nouveau membre inscrit</h2>
          <p><strong>Nom :</strong> ${escapeHtml(fullName)}</p>
          <p><strong>Email :</strong> ${escapeHtml(email)}</p>
          <p><strong>Téléphone :</strong> ${escapeHtml(phone)}</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app"}/dashboard/coach/communaute/membres" style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;margin-top:8px;">Voir la communauté</a>
        </div>`,
      });
    } catch (e) { console.error("Coach email error:", e); }
  }

  // Notif in-app + push au coach assigné — jusqu'ici seul l'email existait,
  // donc rien n'apparaissait dans sa cloche de notifications à l'inscription
  // d'un nouveau membre.
  if (coach) {
    notifyUser(coach.id, {
      type: "new_member_signup",
      title: "👋 Nouveau membre inscrit",
      body: `${fullName} vient de rejoindre la communauté.`,
      url: "/dashboard/coach/communaute/membres",
    }).catch(() => {});
  }

  notifyAdmin("Nouvelle inscription membre/client", [
    `<strong>${escapeHtml(fullName)}</strong> (${escapeHtml(email)})`,
    `Rattaché à : ${escapeHtml(coach?.full_name ?? "aucun coach")}`,
  ]).catch(() => {});

  // Fire-and-forget : si le coach rattaché (lien d'invitation) est un coach
  // IA, il se présente vraiment au nouveau membre — voir lib/ai-coach-welcome.ts.
  if (coach) {
    maybeSendAICoachWelcome(authData.user.id, coach.id).catch(() => {});
  }

  // Item 41 : récompense le parrain une fois l'inscription bien passée,
  // jamais avant (pas de points sur un compte qui échoue à se créer).
  if (referrer) {
    awardPoints(referrer.id, POINTS.referral, `Parrainage de ${fullName}`, "referral", authData.user.id).catch(() => {});
    notifyUser(referrer.id, {
      type: "referral_signup",
      title: "🎉 Ton parrainage a fonctionné",
      body: `${fullName} vient de rejoindre grâce à toi, +${POINTS.referral} points.`,
      url: "/dashboard/client/profile",
    }).catch(() => {});
  }

  return { success: true, userId: authData.user.id };
}

export async function loginClient(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email    = (formData.get("email")    as string).trim();
  const password = formData.get("password") as string;

  // Verrouillage temporaire après plusieurs échecs sur le même email : évite
  // qu'un robot teste des mots de passe à l'infini.
  const locked = await getLoginLock(email);
  if (locked) return { error: locked };

  const supabase = await createServerSupabase();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !authData.user) {
    const nowLocked = await registerFailedLogin(email);
    return { error: nowLocked ?? "Email ou mot de passe incorrect." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("role").eq("id", authData.user.id).single();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Ton acces n est pas encore cree. Contacte ton coach." };
  }

  await clearLoginAttempts(email);

  if (profile.role === "coach") redirect("/dashboard/coach");
  redirect("/dashboard/client");
}
