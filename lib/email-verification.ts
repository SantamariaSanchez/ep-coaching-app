import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";
import { escapeHtml } from "@/lib/sanitize";
import { wrapBrandedEmail } from "@/lib/mailing-audience";

// Vérification d'email sans casser l'inscription en 30 secondes.
//
// Le compte reste créé avec email_confirm: true côté Supabase Auth : la
// personne est connectée immédiatement et accède à tout, comme avant. La
// vérification réelle est suivie séparément dans profiles.email_verified_at.
//
// On génère un lien à usage unique avec generateLink (qui n'envoie rien) puis
// on l'envoie nous mêmes via Brevo, déjà branché sur le reste de l'app. Le
// lien pointe sur /auth/verifier-email qui consomme le jeton avec verifyOtp.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

// Seul vrai email de bienvenue qu'un membre rattaché à un coach humain
// reçoit (le message de bienvenue généré par IA dans lib/ai-coach-welcome.ts
// ne se déclenche, lui, que pour un coach IA). Avant le 2026-08-30, ce
// contenu se limitait à un lien de confirmation sec, sans un mot d'accueil
// ni la moindre indication de ce qu'il y a à faire dans l'appli — corrigé
// ici en gardant le lien de confirmation (toujours nécessaire) mais en
// l'entourant d'un vrai accueil et de 3 premières actions concrètes.
export function verificationEmailHtml(firstName: string, link: string): string {
  const body = `<p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">Bienvenue</p>
<h1 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">Bienvenue dans EP Coaching, ${escapeHtml(firstName)}</h1>
<p style="margin:0 0 12px;">Ton compte est déjà actif, tu peux t'en servir dès maintenant. Avant tout, confirme que cette adresse est bien la tienne, ça nous permet de te retrouver si tu perds ton mot de passe un jour.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 22px;"><tr><td style="border-radius:10px;background:#E01E1E;"><a href="${link}" style="display:inline-block;padding:13px 30px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:10px;">Confirmer mon email</a></td></tr></table>
<p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#F5EDED;opacity:0.5;">Pour bien démarrer</p>
<p style="margin:0 0 6px;color:rgba(245,237,237,0.8);">1. Fais ton premier bilan du jour, ça prend deux minutes et ça donne à ton coach une vraie photo de départ.</p>
<p style="margin:0 0 6px;color:rgba(245,237,237,0.8);">2. Jette un oeil à la bibliothèque de ressources gratuites, des guides sourcés sur la vraie littérature scientifique.</p>
<p style="margin:0 0 16px;color:rgba(245,237,237,0.8);">3. Complète ta fiche (objectif, matériel, salle) pour que ton programme et ta nutrition collent vraiment à ta situation.</p>
<p style="margin:0;font-size:12px;color:rgba(245,237,237,0.4);">Si tu n'es pas à l'origine de cette inscription, ignore simplement ce message.</p>`;
  return wrapBrandedEmail(body);
}

// Envoie (ou renvoie) l'email de vérification. Ne lève jamais : l'appelant la
// déclenche en tâche de fond, un échec ne doit pas bloquer une inscription.
export async function sendVerificationEmail(
  email: string,
  fullName?: string | null
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) return false;

    const link = `${APP_URL}/auth/verifier-email?token_hash=${encodeURIComponent(tokenHash)}`;
    const firstName = (fullName ?? "").trim().split(" ")[0] || "toi";

    return await sendBrevoEmail({
      to: email,
      subject: "Confirme ton adresse email",
      htmlContent: verificationEmailHtml(firstName, link),
    });
  } catch {
    return false;
  }
}

// Source unique de vérité pour "cet email est il vérifié".
export function isEmailVerified(
  profile: { email_verified_at?: string | null } | null | undefined
): boolean {
  return !!profile?.email_verified_at;
}
