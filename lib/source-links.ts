// Liens de bio et de mail qui disent d'où vient la visite (C64, point 3) :
// ep-coaching.vercel.app/s/instagram, /s/linkedin/ressources, /s/mail/auth/client.
// Redirige vers la page publique demandée avec ?src=<réseau>, lu par
// VisitBeacon (tunnel de la page Leads) et par les guides (origine du lead).
// Fichier pur, testé.

export const SOURCES: Record<string, string> = {
  instagram: "instagram",
  insta: "instagram",
  ig: "instagram",
  tiktok: "tiktok",
  tt: "tiktok",
  linkedin: "linkedin",
  li: "linkedin",
  youtube: "youtube",
  yt: "youtube",
  threads: "threads",
  mail: "brevo",
  email: "brevo",
  brevo: "brevo",
  whatsapp: "whatsapp",
};

/** Cible interne sûre (jamais un autre site), avec la source ajoutée ; null si la source est inconnue. */
export function sourceRedirect(source: string, segments: string[] = []): string | null {
  const src = SOURCES[source.toLowerCase()];
  if (!src) return null;
  const clean = segments
    .map((s) => decodeURIComponent(s))
    .filter((s) => /^[a-z0-9_-]{1,80}$/i.test(s));
  if (clean.length !== segments.length) return `/?src=${src}`;
  const path = clean.length ? `/${clean.join("/")}` : "/";
  if (path.startsWith("/dashboard") || path.startsWith("/api") || path.startsWith("/equipe")) return `/?src=${src}`;
  return `${path}?src=${src}`;
}

// Lien de bio vers l'audit (24/11) : la bio Instagram envoyait tout droit sur
// Calendly, donc aucun clic n'était compté. /s/instagram/audit compte le clic
// (page « /s/audit » dans page_visits, avec la source) puis renvoie vers la
// page de réservation, avec utm_source pour que Calendly garde l'origine.
export const AUDIT_BOOKING_URL = "https://calendly.com/peccoux-manu/audit-strategique";
export const AUDIT_CLICK_PATH = "/s/audit";

/** Vrai si le lien suivi demande la réservation de l'audit (/s/<réseau>/audit). */
export function isAuditLink(segments: string[] = []): boolean {
  return segments.length === 1 && segments[0].toLowerCase() === "audit";
}

/** Adresse Calendly avec la source ; null si la source est inconnue. */
export function auditRedirect(source: string): string | null {
  const src = SOURCES[source.toLowerCase()];
  if (!src) return null;
  const url = new URL(AUDIT_BOOKING_URL);
  url.searchParams.set("utm_source", src);
  url.searchParams.set("utm_medium", "bio");
  return url.toString();
}
