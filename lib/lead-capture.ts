// Capture d'un lead sur un guide gratuit, partagée par l'action serveur de la
// page publique (app/ressources/actions.ts) et par la route publique appelée
// depuis le site vitrine (app/api/public/lead/route.ts). Écrit en base avec
// le client admin (aucune session à ce stade), route le lead vers un setter,
// livre le guide par email et inscrit la personne à la newsletter.
import { routeInboundLead } from "@/lib/staff-automation";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendBrevoEmail, addBrevoContactToList, NEWSLETTER_LIST_ID } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import { getLeadMagnet } from "@/lib/lead-magnets";
import { maybeSendLeadQualification } from "@/lib/lead-qualification";
import { escapeHtml } from "@/lib/sanitize";
import { LEAD_ORIGIN_PLATFORMS, normalizeLeadPlatform, platformFromReferrerHost, UUID_RE, type LeadOriginInput, type LeadOriginPlatform } from "@/lib/lead-origin";

// Origine envoyée par le navigateur (voir lib/lead-origin.ts) : jamais crue
// telle quelle. Plateforme ramenée à la liste connue, script vérifié en base
// (un id inventé est ignoré), hôte du referrer tronqué.
async function resolveOrigin(
  supabase: ReturnType<typeof createAdminClient>,
  origin: LeadOriginInput | null | undefined
): Promise<{ origin_platform: string | null; origin_script_id: string | null; origin_referrer: string | null }> {
  const referrer = typeof origin?.referrer === "string" && /^[a-z0-9.-]{1,120}$/i.test(origin.referrer) ? origin.referrer.toLowerCase() : null;
  let scriptId: string | null = null;
  let scriptPlatform: string | null = null;
  if (typeof origin?.scriptId === "string" && UUID_RE.test(origin.scriptId)) {
    const { data } = await supabase.from("coach_scripts").select("id, platform").eq("id", origin.scriptId).maybeSingle();
    if (data) {
      scriptId = data.id as string;
      scriptPlatform = (data.platform as string | null) ?? null;
    }
  }
  const platform =
    normalizeLeadPlatform(typeof origin?.platform === "string" ? origin.platform : null) ??
    normalizeLeadPlatform(scriptPlatform) ??
    platformFromReferrerHost(referrer);
  return { origin_platform: platform, origin_script_id: scriptId, origin_referrer: referrer };
}

export async function captureLead({
  slug,
  email,
  phone,
  origin,
  source,
}: {
  slug: string;
  email: string;
  phone: string | null;
  origin?: LeadOriginInput | null;
  source: "ressources_public" | "site_vitrine";
}): Promise<{ error?: string }> {
  const magnet = await getLeadMagnet(slug);
  if (!magnet) return { error: "Contenu introuvable." };

  try {
    const supabase = createAdminClient();
    const originFields = await resolveOrigin(supabase, origin);
    const { data: leadRow, error } = await supabase
      .from("leads")
      .insert({
        lead_magnet_slug: slug,
        email: email || null,
        phone,
        source,
        ...originFields,
      })
      .select("id")
      .single();
    if (error) return { error: "Erreur lors de l'enregistrement, réessaie." };

    // Le lead part directement dans le CRM d'un setter (voir
    // lib/staff-automation.ts). Sans setter actif, rien ne se passe : le
    // lead reste visible dans Administration > Leads.
    await routeInboundLead({
      source: "lead_magnet",
      externalId: `leadmagnet:${leadRow.id}`,
      name: null,
      email: email || null,
      phone,
      stage: "nouveau",
      summary: `A téléchargé le guide gratuit "${magnet.title}".${originFields.origin_platform ? ` Arrivé depuis : ${LEAD_ORIGIN_PLATFORMS[originFields.origin_platform as LeadOriginPlatform] ?? originFields.origin_platform}.` : ""}`,
    });

    if (email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
      // Titre injecté dans du HTML : échappé (un titre de lead magnet de
      // coach tiers est une saisie libre). Le sujet reste du texte brut.
      const safeTitle = escapeHtml(magnet.title);
      const magnetUrl = `${appUrl}/ressources/${encodeURIComponent(slug)}`;
      sendBrevoEmail({
        to: email,
        subject: `${magnet.title} : ton contenu EP Coaching`,
        htmlContent: wrapBrandedEmail(`
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">Ton contenu</p>
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">${safeTitle}</h1>
          <p style="margin:0 0 4px;">Merci de t'être inscrit(e). Ton contenu est débloqué directement sur la page, tu peux aussi y revenir quand tu veux avec ce lien :</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td style="border-radius:10px;background:#E01E1E;"><a href="${magnetUrl}" style="display:inline-block;padding:13px 30px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:10px;">Retrouver le contenu</a></td></tr></table>
          <p style="margin:0 0 4px;color:rgba(245,237,237,0.75);">À partir de maintenant, tu reçois aussi un email court par jour : une chose concrète à appliquer le jour même. Tu peux te désabonner à tout moment depuis n'importe lequel de ces emails.</p>
          <p style="margin:16px 0 4px;">Et si tu veux aller plus loin avec un vrai suivi personnalisé, l'appli EP Coaching t'attend :</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0;"><tr><td style="border-radius:10px;border:1px solid #E01E1E;"><a href="${appUrl}/auth/client" style="display:inline-block;padding:12px 28px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#E01E1E;text-decoration:none;border-radius:10px;">Créer mon compte</a></td></tr></table>
        `),
      }).catch(() => {});

      // Rejoint la newsletter dès qu'un email est laissé (fire-and-forget).
      addBrevoContactToList(email, NEWSLETTER_LIST_ID).catch(() => {});

      // Suivi commercial par l'agent Setter (lib/lead-qualification.ts).
      if (leadRow) {
        maybeSendLeadQualification(leadRow.id, email, magnet.title).catch(() => {});
      }
    }

    return {};
  } catch (e) {
    console.error("captureLead error:", e);
    return { error: "Erreur inattendue, réessaie." };
  }
}
