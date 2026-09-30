// Origine réelle d'un lead (LANCEMENT.md, semaine 2 : « Leads : origine par
// contenu visible en 1 écran »). Jusqu'ici un lead ne portait que le numéro
// de leadmagnet téléchargé : impossible de savoir s'il venait d'une vidéo
// YouTube, d'un reel ou d'un partage, et plusieurs scripts citant le même
// numéro rendaient toute attribution approximative (voir
// lib/content-leads-tracking.ts). Deux signaux réels sont désormais gardés :
//  - le lien suivi copié depuis un script (…/ressources/<slug>?src=<plateforme>&c=<id du script>),
//    attribution exacte, seule à pouvoir être créditée à UN contenu ;
//  - le site d'où arrive le visiteur (document.referrer), qui donne la
//    plateforme même sans lien suivi (Instagram et TikTok le masquent
//    souvent, d'où « inconnue » assumée plutôt qu'une supposition).
// Module pur, partagé par la page publique (client) et l'action serveur.

export const LEAD_ORIGIN_PLATFORMS = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  threads: "Threads",
  linkedin: "LinkedIn",
  google: "Recherche Google",
  email: "Email",
  whatsapp: "WhatsApp",
  site: "Site EP Coaching",
  autre: "Autre site",
} as const;

export type LeadOriginPlatform = keyof typeof LEAD_ORIGIN_PLATFORMS;

export interface LeadOriginInput {
  platform?: string | null;
  scriptId?: string | null;
  referrer?: string | null;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PLATFORM_ALIASES: Record<string, LeadOriginPlatform> = {
  yt: "youtube",
  youtube: "youtube",
  ig: "instagram",
  insta: "instagram",
  instagram: "instagram",
  tt: "tiktok",
  tiktok: "tiktok",
  fb: "facebook",
  facebook: "facebook",
  threads: "threads",
  linkedin: "linkedin",
  google: "google",
  email: "email",
  newsletter: "email",
  brevo: "email",
  whatsapp: "whatsapp",
  wa: "whatsapp",
};

export function normalizeLeadPlatform(raw: string | null | undefined): LeadOriginPlatform | null {
  if (!raw) return null;
  return PLATFORM_ALIASES[raw.trim().toLowerCase()] ?? null;
}

// Nom d'hôte du referrer → plateforme. Jamais l'URL complète (elle peut
// contenir des paramètres personnels), seulement l'hôte.
export function platformFromReferrerHost(host: string | null | undefined, ownHost?: string | null): LeadOriginPlatform | null {
  if (!host) return null;
  const h = host.toLowerCase().replace(/^www\./, "");
  if (ownHost && h === ownHost.toLowerCase().replace(/^www\./, "")) return "site";
  if (h.endsWith("ep-coaching.vercel.app")) return "site";
  if (h === "youtu.be" || h.endsWith("youtube.com")) return "youtube";
  if (h.endsWith("instagram.com")) return "instagram";
  if (h.endsWith("tiktok.com")) return "tiktok";
  if (h.endsWith("facebook.com") || h === "fb.me" || h === "m.me") return "facebook";
  if (h.endsWith("threads.net") || h.endsWith("threads.com")) return "threads";
  if (h.endsWith("linkedin.com") || h === "lnkd.in") return "linkedin";
  if (/(^|\.)google\.[a-z.]+$/.test(h)) return "google";
  if (h.endsWith("whatsapp.com") || h === "wa.me") return "whatsapp";
  if (h.includes("mail.") || h.includes("sendibt") || h.includes("brevo")) return "email";
  return "autre";
}

// Lien à coller en description ou en bio : le seul qui crédite un lead à ce
// contenu précis.
export function buildTrackedLeadLink(appUrl: string, slug: string, platform: string | null | undefined, scriptId: string): string {
  const src = normalizeLeadPlatform(platform);
  const params = new URLSearchParams();
  if (src) params.set("src", src);
  params.set("c", scriptId);
  return `${appUrl}/ressources/${encodeURIComponent(slug)}?${params.toString()}`;
}
