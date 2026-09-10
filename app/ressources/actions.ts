"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail, addBrevoContactToList, NEWSLETTER_LIST_ID } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import { getLeadMagnet } from "@/lib/lead-magnets";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { maybeSendLeadQualification } from "@/lib/lead-qualification";
import { headers } from "next/headers";

// Liste Brevo "Newsletter EP Coaching" (grand public, contenu de valeur
// récurrent) — voir lib/brevo-mailing.ts pour la liste dédiée aux membres de
// l'app, distincte de celle-ci. Un lead qui télécharge un guide gratuit
// n'était jusqu'ici jamais ajouté à aucune liste : il recevait le mail de
// livraison, une éventuelle qualification par l'agent Setter, puis plus
// jamais rien. Demande explicite 2026-08-31 : dès qu'un email est laissé, la
// personne doit rejoindre le marketing en cours. NEWSLETTER_LIST_ID vit
// maintenant dans utils/brevo.ts (2026-09-10, était dupliqué ici).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.length >= 6 ? digits : null;
}

// Adresse IP de l'appelant — même pattern que callerIp() dans
// app/auth/client/actions.ts, dupliqué ici plutôt que partagé pour éviter un
// import croisé entre deux dossiers publics sans lien fonctionnel.
async function callerIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "inconnu";
  } catch {
    return "inconnu";
  }
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
  // Masterclass Axe P : action publique, sans authentification, qui insère
  // en base via le client admin (RLS contournée) ET déclenche un envoi
  // d'email — strictement aucune limite avant ce fix. Même preset que les
  // autres envois d'email déclenchés par un utilisateur (5/h), par IP.
  const ip = await callerIp();
  const limited = await checkRateLimit(`lead-submit:${ip}`, PRESETS.email.limit, PRESETS.email.windowSeconds);
  if (!limited.allowed) {
    return { error: "Trop de tentatives, réessaie dans un instant." };
  }

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

  const magnet = await getLeadMagnet(slug);
  if (!magnet) return { error: "Contenu introuvable." };

  try {
    const supabase = createAdminClient();
    const { data: leadRow, error } = await supabase
      .from("leads")
      .insert({
        lead_magnet_slug: slug,
        email: trimmedEmail || null,
        phone: normalizedPhone,
        source: "ressources_public",
      })
      .select("id")
      .single();
    if (error) return { error: "Erreur lors de l'enregistrement, réessaie." };

    if (trimmedEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
      sendBrevoEmail({
        to: trimmedEmail,
        subject: `${magnet.title} : ton contenu EP Coaching`,
        htmlContent: wrapBrandedEmail(`
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">Ton contenu</p>
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">${magnet.title}</h1>
          <p style="margin:0 0 4px;">Merci de t'être inscrit(e). Ton contenu est débloqué directement sur la page, tu peux aussi y revenir quand tu veux avec ce lien :</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td style="border-radius:10px;background:#E01E1E;"><a href="${appUrl}/ressources/${slug}" style="display:inline-block;padding:13px 30px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:10px;">Retrouver le contenu</a></td></tr></table>
          <p style="margin:0 0 4px;color:rgba(245,237,237,0.75);">À partir de maintenant tu vas aussi recevoir d'autres contenus gratuits comme celui-ci par email (nutrition, entraînement, récupération, mental), sourcés sur la vraie littérature scientifique. Tu peux te désabonner à tout moment depuis n'importe lequel de ces emails.</p>
          <p style="margin:16px 0 4px;">Et si tu veux aller plus loin avec un vrai suivi personnalisé, l'appli EP Coaching t'attend :</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0;"><tr><td style="border-radius:10px;border:1px solid #E01E1E;"><a href="${appUrl}/auth/client" style="display:inline-block;padding:12px 28px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#E01E1E;text-decoration:none;border-radius:10px;">Créer mon compte</a></td></tr></table>
        `),
      }).catch(() => {});

      // Rejoint le marketing en cours (newsletter générale) dès qu'un email
      // est laissé, pour ne plus jamais rester un contact isolé après ce
      // seul mail de livraison — fire-and-forget, jamais bloquant.
      addBrevoContactToList(trimmedEmail, NEWSLETTER_LIST_ID).catch(() => {});

      // Suivi commercial réel par l'agent Setter (lib/lead-qualification.ts) —
      // fire-and-forget, distinct de l'email de remise du guide ci-dessus.
      if (leadRow) {
        maybeSendLeadQualification(leadRow.id, trimmedEmail, magnet.title).catch(() => {});
      }
    }

    return {};
  } catch (e) {
    console.error("submitLead error:", e);
    return { error: "Erreur inattendue, réessaie." };
  }
}
