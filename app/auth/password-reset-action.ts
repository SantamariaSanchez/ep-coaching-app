"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import { checkRateLimit } from "@/lib/rate-limit";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

// Lien « mot de passe oublié » envoyé par Brevo (retour 2026-10-20 : la
// seule coach de l'appli ne recevait jamais le mail). L'envoi par défaut de
// Supabase n'écrit qu'aux adresses de l'équipe du projet, 2 mails par heure :
// personne d'autre ne recevait rien. Le lien est généré côté serveur et
// passe par /auth/callback (token_hash) puis la page du nouveau mot de passe.
// Réponse identique que le compte existe ou non (pas d'énumération).
export async function requestPasswordReset(rawEmail: string): Promise<{ ok: true }> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || email.length > 254 || !email.includes("@")) return { ok: true };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "inconnu";
  const [byEmail, byIp] = await Promise.all([
    checkRateLimit(`pwd-reset:${email}`, 3, 3600),
    checkRateLimit(`pwd-reset-ip:${ip}`, 10, 3600),
  ]);
  if (!byEmail.allowed || !byIp.allowed) return { ok: true };

  try {
    const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) return { ok: true };
    const link = `${APP_URL}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=/auth/reset-password`;
    await sendBrevoEmail({
      to: email,
      subject: "Ton lien pour changer de mot de passe",
      htmlContent: wrapBrandedEmail(`
        <p>Salut,</p>
        <p>Tu as demandé à changer ton mot de passe EP Coaching. Touche le bouton ci-dessous, il est valable 1 heure.</p>
        <p style="margin:24px 0;"><a href="${link}" style="background:#E01E1E;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;">Choisir mon nouveau mot de passe</a></p>
        <p style="font-size:13px;opacity:0.7;">Ce n'est pas toi ? Ignore ce mail, ton mot de passe reste le même.</p>
      `),
    });
  } catch (e) {
    console.error("requestPasswordReset error:", e);
  }
  return { ok: true };
}
