// Recherche approximative partagée (retour direct 2026-09-16 : "améliore
// toutes les barres de recherche pour qu'on trouve même si c'est mal écrit
// ou approximatif"). Avant cet utilitaire, chaque barre de recherche du
// repo refaisait sa propre sous-chaîne exacte (`.includes(q)`), parfois avec
// une normalisation d'accents locale (ex. IdeationScripts.tsx), jamais
// tolérante à une faute de frappe, une lettre manquante ou une inversion.
//
// Approche volontairement simple (pas de librairie externe, pas d'index à
// construire) : normaliser accents/casse, découper en mots, et pour chaque
// mot de la requête accepter soit une sous-chaîne exacte (cas normal, rapide
// et prioritaire), soit une distance de Levenshtein courte sur un mot du
// texte cible (tolère les fautes). Le seuil de tolérance grandit avec la
// longueur du mot : un mot de 3 lettres ne tolère aucune erreur (sinon tout
// matche), un mot long en tolère 2.

/** Distance de Levenshtein classique (nombre minimal d'insertions/suppressions/substitutions). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // suppression
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

function toleranceFor(wordLength: number): number {
  if (wordLength <= 3) return 0;
  if (wordLength <= 6) return 1;
  return 2;
}

/** minuscule + accents retirés (NFD, retire les diacritiques combinants). */
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * true si chaque mot de `query` correspond à au moins un mot de `haystack`,
 * soit en sous-chaîne exacte soit à une distance de Levenshtein tolérée
 * (voir `toleranceFor`). Les deux chaînes sont normalisées ici, pas besoin
 * de le faire avant d'appeler.
 */
export function fuzzyMatch(haystack: string, query: string): boolean {
  const q = normalizeForSearch(query).trim();
  if (!q) return true;
  const h = normalizeForSearch(haystack);

  const queryWords = q.split(/\s+/).filter(Boolean);
  const haystackWords = h.split(/\s+/).filter(Boolean);

  return queryWords.every((qw) => {
    if (h.includes(qw)) return true;
    const tolerance = toleranceFor(qw.length);
    if (tolerance === 0) return false;
    return haystackWords.some((hw) => {
      // Filet rapide avant le calcul complet : une trop grande différence de
      // longueur ne peut jamais rester sous la tolérance.
      if (Math.abs(hw.length - qw.length) > tolerance) return false;
      return levenshtein(hw, qw) <= tolerance;
    });
  });
}

/** Variante pratique pour filtrer une liste sur plusieurs champs texte à la fois. */
export function fuzzyMatchAny(fields: Array<string | null | undefined>, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const haystack = fields.filter(Boolean).join(" ");
  return fuzzyMatch(haystack, q);
}
