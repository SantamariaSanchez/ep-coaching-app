// Mots-clés d'appel à l'action des scripts (« commente 088 », « commente APPLI »).
// Un chiffre doit correspondre à un vrai guide (lead_magnets.keyword) : un mot-clé
// qui n'existe pas fait commenter des gens à qui on ne peut rien envoyer
// (cas réel du 5 nov. 2026 : « PROG » cité dans deux reels, aucun guide).
// Les mots logiques ci-dessous sont gérés à la main par le coach.

export const LOGICAL_CTA_KEYWORDS = ["APPLI", "COACHING"] as const;

const CTA_RE = /\bcomment(?:e|ez|er)\s+(?:le\s+(?:mot|chiffre|code|numéro)\s+)?[«"“'‘]?\s*([A-Za-z0-9]+)/gi;

/** Mots-clés cités après « commente » : un nombre (2 chiffres ou plus) ou un mot écrit en capitales (3 lettres ou plus). */
export function extractCtaKeywords(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const m of text.matchAll(CTA_RE)) {
    const raw = m[1];
    if (/^\d{2,}$/.test(raw) || /^[A-Z]{3,}$/.test(raw)) found.add(raw.toUpperCase());
  }
  return [...found];
}

/** Mots-clés cités qui ne correspondent ni à un guide connu ni à un mot logique. `isKnownGuide` reçoit le mot tel qu'écrit. */
export async function findUnknownCtaKeywords(
  text: string | null | undefined,
  isKnownGuide: (keyword: string) => Promise<boolean>
): Promise<string[]> {
  const unknown: string[] = [];
  for (const keyword of extractCtaKeywords(text)) {
    if ((LOGICAL_CTA_KEYWORDS as readonly string[]).includes(keyword)) continue;
    if (await isKnownGuide(keyword)) continue;
    unknown.push(keyword);
  }
  return unknown;
}

export function ctaKeywordWarning(unknown: string[]): string {
  if (!unknown.length) return "";
  return `\nAttention : ${unknown.join(", ")} ne correspond à aucun guide (lister_guides donne les vrais numéros) ni à APPLI ou COACHING. Corrige l'appel à l'action avant de tourner.`;
}
