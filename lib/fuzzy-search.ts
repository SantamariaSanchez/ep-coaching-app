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

/**
 * Distance d'édition avec inversion de deux lettres voisines comptée comme
 * une seule faute (« sqaut » pour « squat ») : variante « alignement
 * optimal » de Damerau-Levenshtein.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const d: number[][] = Array.from({ length: al + 1 }, (_, i) => {
    const row = new Array<number>(bl + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= bl; j++) d[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[al][bl];
}

function toleranceFor(wordLength: number): number {
  if (wordLength <= 3) return 0;
  if (wordLength <= 6) return 1;
  return 2;
}

/** minuscule, accents retirés, ligatures dépliées, ponctuation en espaces. */
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9#@\s]/g, " ");
}

// Pluriel simple du français : « bananes » trouve « banane », « noix »
// reste « noix » (mot court), « chevaux » n'est pas géré (rare ici).
function singular(w: string): string {
  return w.length > 3 && (w.endsWith("s") || w.endsWith("x")) ? w.slice(0, -1) : w;
}

/**
 * Score de correspondance d'un mot de requête dans un texte normalisé :
 * 3 début du texte, 2 début d'un mot, 1 sous-chaîne, 0.5 faute tolérée
 * (Levenshtein sur un mot entier ou sur le début d'un mot, pour une saisie
 * en cours), -1 si aucune correspondance.
 */
function wordScore(qw: string, h: string, words: string[]): number {
  const variants = qw === singular(qw) ? [qw] : [qw, singular(qw)];
  for (const v of variants) {
    if (h.startsWith(v)) return 3;
    if (words.some((w) => w.startsWith(v))) return 2;
    if (h.includes(v)) return 1;
  }
  const tolerance = toleranceFor(qw.length);
  if (tolerance === 0) return -1;
  for (const w of words) {
    const ws = singular(w);
    for (const cand of [w, ws, w.slice(0, qw.length)]) {
      if (Math.abs(cand.length - qw.length) > tolerance) continue;
      if (levenshtein(cand, qw) <= tolerance || levenshtein(cand, singular(qw)) <= tolerance) return 0.5;
    }
  }
  return -1;
}

/**
 * true si chaque mot de `query` correspond à au moins un mot de `haystack`,
 * en sous-chaîne, en début de mot, au singulier, ou avec une faute de frappe
 * tolérée (voir `toleranceFor`). Les deux chaînes sont normalisées ici.
 */
export function fuzzyMatch(haystack: string, query: string): boolean {
  return fuzzyScore(haystack, query) >= 0;
}

/**
 * Score de pertinence (plus haut = meilleur), -1 si pas de correspondance.
 * Sert à trier : le nom exact d'abord, puis les débuts de mots, puis les
 * correspondances approximatives.
 */
export function fuzzyScore(haystack: string, query: string): number {
  const q = normalizeForSearch(query).trim();
  if (!q) return 0;
  const h = normalizeForSearch(haystack).trim();
  const words = h.split(/\s+/).filter(Boolean);
  let total = 0;
  for (const qw of q.split(/\s+/).filter(Boolean)) {
    const s = wordScore(qw, h, words);
    if (s < 0) return -1;
    total += s;
  }
  if (h === q) total += 5;
  else if (h.startsWith(q)) total += 2;
  return total;
}

/** Variante pratique pour filtrer une liste sur plusieurs champs texte à la fois. */
export function fuzzyMatchAny(fields: Array<string | null | undefined>, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return fuzzyMatch(fields.filter(Boolean).join(" "), q);
}

/**
 * Filtre et trie une liste par pertinence. Le premier champ compte double
 * (en général le nom), pour qu'un titre qui correspond passe avant une
 * description qui correspond.
 */
export function fuzzyFilter<T>(items: T[], fields: (item: T) => Array<string | null | undefined>, query: string): T[] {
  const q = query.trim();
  if (!q) return items;
  const scored: { item: T; score: number; i: number }[] = [];
  items.forEach((item, i) => {
    const f = fields(item);
    const primary = fuzzyScore(f[0] ?? "", q);
    const all = primary >= 0 ? primary * 2 : fuzzyScore(f.filter(Boolean).join(" "), q);
    if (all >= 0) scored.push({ item, score: all, i });
  });
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored.map((s) => s.item);
}
