// En-têtes pour servir un fichier HTML ou SVG venu du stockage depuis le
// domaine de l'appli. Sans bac à sable, un script glissé dans ce fichier
// tournerait avec la session de la personne qui l'ouvre (cookie lisible,
// actions en son nom). « sandbox » sans allow-same-origin donne au document
// une origine à part : ses scripts tournent, mais ne voient ni cookie, ni
// stockage, ni API de l'appli. Les liens et téléchargements restent possibles.
export const UNTRUSTED_DOC_CSP =
  "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads allow-top-navigation-by-user-activation";

const ACTIVE_TYPES = /^(text\/html|image\/svg\+xml|application\/xhtml\+xml|text\/xml|application\/xml)/i;

/** Vrai pour un type de contenu que le navigateur peut exécuter (HTML, SVG, XML). */
export function isActiveContentType(contentType: string | null | undefined): boolean {
  return ACTIVE_TYPES.test((contentType ?? "").trim());
}

/** En-têtes de réponse d'un fichier du stockage, bac à sable ajouté si le type est exécutable. */
export function storageFileHeaders(contentType: string, cacheControl: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Disposition": "inline",
    "Cache-Control": cacheControl,
  };
  if (isActiveContentType(contentType)) headers["Content-Security-Policy"] = UNTRUSTED_DOC_CSP;
  return headers;
}
