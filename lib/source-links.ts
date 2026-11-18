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
