"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail } from "@/utils/brevo";
import { getLeadMagnet } from "@/lib/lead-magnets";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.length >= 6 ? digits : null;
}

// Capture email/téléphone avant de débloquer un lead magnet (voir
// lib/lead-magnets.ts et components/ressources/LeadMagnetLanding.tsx) —
// écrit directement en base avec le client admin puisqu'il n'y a aucune
// session (page publique, personne n'est connecté à ce stade).
export async function submitLead(
  slug: string,
  email: string,
  phone: string
): Promise<{ error?: string }> {
  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();

  if (!trimmedEmail && !trimmedPhone) {
    return { error: "Laisse au moins ton email ou ton numéro." };
  }
  if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
    return { error: "Cet email ne semble pas valide." };
  }
  const normalizedPhone = trimmedPhone ? normalizePhone(trimmedPhone) : null;
  if (trimmedPhone && !normalizedPhone) {
    return { error: "Ce numéro ne semble pas valide." };
  }

  const magnet = getLeadMagnet(slug);
  if (!magnet) return { error: "Contenu introuvable." };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("leads").insert({
      lead_magnet_slug: slug,
      email: trimmedEmail || null,
      phone: normalizedPhone,
      source: "ressources_public",
    });
    if (error) return { error: "Erreur lors de l'enregistrement, réessaie." };

    if (trimmedEmail) {
      sendBrevoEmail({
        to: trimmedEmail,
        subject: `${magnet.title} : ton contenu EP Coaching`,
        htmlContent: `
          <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
            <h2 style="color:#E01E1E;margin-top:0;">${magnet.title}</h2>
            <p>Merci de t'être inscrit(e). Ton contenu est débloqué directement sur la page, tu peux aussi y revenir quand tu veux avec ce lien :</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app"}/ressources/${slug}"
               style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                      text-decoration:none;display:inline-block;margin-top:12px;font-weight:bold;">
              Retrouver le contenu
            </a>
            <p style="margin-top:24px;">Et si tu veux aller plus loin avec un vrai suivi personnalisé, l'appli EP Coaching t'attend :</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app"}/auth/client"
               style="background:transparent;color:#E01E1E;border:1px solid #E01E1E;padding:12px 24px;border-radius:8px;
                      text-decoration:none;display:inline-block;margin-top:8px;font-weight:bold;">
              Créer mon compte
            </a>
          </div>
        `,
      }).catch(() => {});
    }

    return {};
  } catch {
    return { error: "Erreur inattendue, réessaie." };
  }
}
