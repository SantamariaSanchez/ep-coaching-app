// Cœur partagé de l'inscription d'un membre : appelé par l'inscription par
// e-mail (app/auth/client/actions.ts) et par la première connexion Google ou
// Apple (app/auth/oauth/finish/route.ts). Volontairement hors d'un fichier
// "use server" : ces fonctions ne doivent jamais devenir des actions
// appelables depuis le navigateur.

import { routeInboundLead } from "@/lib/staff-automation";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail, addBrevoContactToList, NEWSLETTER_LIST_ID } from "@/utils/brevo";
import { notifyAdmin } from "@/lib/admin-notify";
import { notifyUser } from "@/lib/notify";
import { awardPoints } from "@/lib/gamification";
import { POINTS } from "@/lib/gamification-types";
import { sendVerificationEmail } from "@/lib/email-verification";
import { escapeHtml } from "@/lib/sanitize";
import { maybeSendAICoachWelcome } from "@/lib/ai-coach-welcome";
import { after } from "next/server";

// Résout un éventuel parrain — n'importe quel profil (coach ou pas), pas
// filtré par role contrairement à resolveCoachId ci-dessous.
export async function resolveReferrer(
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

// Résout quel coach doit récupérer ce nouveau membre : le titulaire du code
// d'invitation s'il est valide et a un abonnement plateforme actif, sinon
// le propriétaire historique de la plateforme (comportement d'origine).
export async function resolveCoachId(
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


export interface ClientSignupContext {
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  coach: { id: string; email: string | null; full_name: string | null } | null;
  referrer: { id: string; full_name: string | null } | null;
  wantsNewsletter?: boolean;
  /** Adresse déjà vérifiée par le fournisseur (Google, Apple) : pas d'e-mail de confirmation. */
  emailAlreadyVerified?: boolean;
}

// Tout ce qui suit la création du profil d'un membre : e-mail de confirmation,
// prévenir le coach rattaché et le fondateur, CRM, bienvenue du coach IA,
// points de parrainage, newsletter (seulement sur consentement explicite).
export async function afterClientSignup(ctx: ClientSignupContext): Promise<void> {
  const { admin, userId, fullName, email, phone, coach, referrer } = ctx;
  // Email de confirmation en tâche de fond : l'écran d'inscription ne l'attend
  // pas, le membre enchaîne directement sur son espace.
  if (!ctx.emailAlreadyVerified) after(() => sendVerificationEmail(email, fullName).catch(() => {}));

  if (coach?.email) {
    try {
      await sendBrevoEmail({
        to: coach.email,
        subject: `Nouveau membre communauté - ${fullName}`,
        htmlContent: `<div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
          <h2 style="color:#E01E1E;margin-top:0;">Nouveau membre inscrit</h2>
          <p><strong>Nom :</strong> ${escapeHtml(fullName)}</p>
          <p><strong>Email :</strong> ${escapeHtml(email)}</p>
          <p><strong>Téléphone :</strong> ${escapeHtml(phone ?? "non renseigné")}</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app"}/dashboard/coach/communaute/membres" style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;margin-top:8px;">Voir la communauté</a>
        </div>`,
      });
    } catch (e) { console.error("Coach email error:", e); }
  }

  // Notif in-app + push au coach assigné — jusqu'ici seul l'email existait,
  // donc rien n'apparaissait dans sa cloche de notifications à l'inscription
  // d'un nouveau membre.
  if (coach) {
    after(() => notifyUser(coach.id, {
      type: "new_member_signup",
      title: "👋 Nouveau membre inscrit",
      body: `${fullName} vient de rejoindre la communauté.`,
      url: "/dashboard/coach/communaute/membres",
    }).catch(() => {}));
  }

  // Un nouveau membre d'EP Coaching (rattaché au fondateur ou à un coach IA)
  // est aussi un prospect pour le coaching humain : il arrive dans le CRM
  // d'un setter (lib/staff-automation.ts). Jamais les membres d'un coach
  // tiers : ce sont SES clients, pas des prospects d'EP Coaching.
  if (coach) {
    const { data: coachFlags } = await admin.from("profiles").select("is_platform_owner, is_ai_coach").eq("id", coach.id).maybeSingle();
    if (coachFlags?.is_platform_owner || coachFlags?.is_ai_coach) {
      await routeInboundLead({
        source: "app_signup",
        externalId: `signup:${userId}`,
        name: fullName,
        email,
        phone: phone || null,
        stage: "nouveau",
        summary: "S'est inscrit gratuitement dans l'appli (membre de la communauté).",
      });
    }
  }

  notifyAdmin("Nouvelle inscription membre/client", [
    `<strong>${escapeHtml(fullName)}</strong> (${escapeHtml(email)})`,
    `Rattaché à : ${escapeHtml(coach?.full_name ?? "aucun coach")}`,
  ], { url: "/dashboard/coach/communaute/membres" }).catch(() => {});

  // Fire-and-forget : si le coach rattaché (lien d'invitation) est un coach
  // IA, il se présente vraiment au nouveau membre — voir lib/ai-coach-welcome.ts.
  if (coach) {
    after(() => maybeSendAICoachWelcome(userId, coach.id).catch(() => {}));
  }

  // Item 41 : récompense le parrain une fois l'inscription bien passée,
  // jamais avant (pas de points sur un compte qui échoue à se créer).
  if (referrer) {
    after(() => awardPoints(referrer.id, POINTS.referral, `Parrainage de ${fullName}`, "referral", userId).catch(() => {}));
    after(() => notifyUser(referrer.id, {
      type: "referral_signup",
      title: "🎉 Ton parrainage a fonctionné",
      body: `${fullName} vient de rejoindre grâce à toi, +${POINTS.referral} points.`,
      url: "/dashboard/client/profile",
    }).catch(() => {}));
  }

  // Newsletter (2026-09-10) : consentement séparé et explicite, coché par
  // la personne elle-même au formulaire (jamais pré-coché, voir
  // wantsNewsletter ci-dessus) — jamais un ajout silencieux déduit de
  // l'acceptation des CGU. Fire-and-forget comme les autres effets de bord
  // de cette fonction : un échec Brevo ne doit jamais faire échouer la
  // création de compte.
  if (ctx.wantsNewsletter === true) {
    after(() => addBrevoContactToList(email, NEWSLETTER_LIST_ID, fullName.split(" ")[0]).catch(() => {}));
  }

}
