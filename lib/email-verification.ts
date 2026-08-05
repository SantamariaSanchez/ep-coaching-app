import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";

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

export function verificationEmailHtml(firstName: string, link: string): string {
  return `<div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
    <h2 style="color:#E01E1E;margin-top:0;">Confirme ton adresse email</h2>
    <p>Salut ${firstName},</p>
    <p>Ton compte EP Coaching est déjà actif, tu peux t'en servir tout de suite.</p>
    <p>Il reste juste à confirmer que cette adresse est bien la tienne : c'est ce qui nous permet de te retrouver si tu perds ton mot de passe.</p>
    <a href="${link}" style="background:#E01E1E;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;margin:12px 0;">Confirmer mon email</a>
    <p style="font-size:12px;color:rgba(245,237,237,0.5);">Si tu n'es pas à l'origine de cette inscription, ignore simplement ce message.</p>
  </div>`;
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
