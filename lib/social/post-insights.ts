// « Ce qui marche et comment le refaire » : lecture d'une publication à partir
// de ses chiffres (saisis ou lus sur une capture), comparée aux autres
// publications du même coach. Code pur, aucune IA, aucun chiffre de
// référence extérieur : on compare le coach à lui-même.
//
// Décision d'Emmanuel (03/11/2026) : les stats brutes sont déjà sur les
// réseaux ; l'appli sert à savoir ce qui fonctionne et comment le refaire.
// Les conseils ci-dessous sont des décisions produit (règles de lecture),
// pas des faits scientifiques : ils restent formulés comme des pistes.

export interface PostNumbers {
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  new_followers: number | null;
  avg_watch_seconds: number | null;
  duration_seconds: number | null;
  completion_rate: number | null;
}

export type Signal = "partages" | "enregistrements" | "commentaires" | "abonnes" | "retention" | "jaime" | "vues";

export const SIGNAL_LABELS: Record<Signal, string> = {
  partages: "Partages",
  enregistrements: "Enregistrements",
  commentaires: "Commentaires",
  abonnes: "Abonnés gagnés",
  retention: "Temps regardé",
  jaime: "J'aime",
  vues: "Vues",
};

/** Moins de publications comparables que ça : pas de comparaison, on le dit. */
export const MIN_COMPARABLE = 3;
/** Au-dessus de ce rapport à sa propre médiane : point fort. En dessous de l'inverse : point faible. */
export const STRONG_RATIO = 1.3;
export const WEAK_RATIO = 0.7;

const n = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));

/** Taux rapportés à l'audience (vues, sinon portée) et rétention. Null si non calculable. */
export function postRates(p: PostNumbers): Partial<Record<Signal, number>> {
  const base = n(p.views) ?? n(p.reach);
  const out: Partial<Record<Signal, number>> = {};
  if (base && base > 0) {
    const per = (x: number | null | undefined) => (n(x) === null ? undefined : (n(x) as number) / base);
    const set = (k: Signal, v: number | undefined) => {
      if (v !== undefined) out[k] = v;
    };
    set("partages", per(p.shares));
    set("enregistrements", per(p.saves));
    set("commentaires", per(p.comments));
    set("abonnes", per(p.new_followers));
    set("jaime", per(p.likes));
    out.vues = base;
  }
  const completion = n(p.completion_rate);
  const watch = n(p.avg_watch_seconds);
  const duration = n(p.duration_seconds);
  if (completion !== null) out.retention = completion / 100;
  else if (watch !== null && duration && duration > 0) out.retention = Math.min(1, watch / duration);
  return out;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type Verdict = "a_refaire" | "dans_ta_moyenne" | "en_dessous" | "pas_assez";

export interface PostReading {
  verdict: Verdict;
  /** Moyenne géométrique des rapports à la médiane (1 = dans sa moyenne). */
  score: number | null;
  ratios: Partial<Record<Signal, number>>;
  strengths: Signal[];
  weaknesses: Signal[];
  /** Pistes concrètes pour refaire (ou corriger). */
  howTo: string[];
  /** Nombre de publications utilisées pour comparer. */
  compared: number;
}

const STRENGTH_TIPS: Record<Signal, string> = {
  partages: "Les gens l'ont envoyée à quelqu'un : le sujet parle d'une situation qu'ils vivent. Refais ce sujet sous un autre angle, avec le même type de hook.",
  enregistrements: "Ils l'ont gardée pour plus tard : le contenu est utile. Refais-en une version liste, étapes ou exemple concret sur un sujet voisin.",
  commentaires: "Elle a fait réagir : garde la question ou l'avis tranché de la fin, et réponds aux meilleurs commentaires en vidéo.",
  abonnes: "Elle donne envie de voir la suite : transforme-la en série (partie 2, partie 3) et annonce la suite à la fin.",
  retention: "Les gens sont restés : réutilise la même ouverture, le même rythme et une durée proche.",
  jaime: "Elle a plu : garde le même format et le même ton pour la prochaine.",
  vues: "Le sujet attire : garde-le, et décline-le en plusieurs vidéos.",
};

const WEAKNESS_TIPS: Partial<Record<Signal, string>> = {
  retention: "On décroche vite : raccourcis l'intro et montre le résultat ou la réponse dès les premières secondes.",
  vues: "Peu de vues : garde le sujet et le format, change seulement le hook (les 3 premières secondes) et teste-en plusieurs versions.",
  enregistrements: "Peu gardée : ajoute un point concret à retenir (un chiffre de ton plan, une étape, une liste).",
  partages: "Peu partagée : parle d'une situation précise que ta cible vit, pas d'un sujet général.",
  commentaires: "Peu de réactions : termine par une question précise, à laquelle on répond en un mot.",
};

/**
 * Lit une publication en la comparant aux autres publications du coach
 * (médiane de chaque taux). Avec moins de MIN_COMPARABLE publications
 * comparables, aucune comparaison n'est inventée : verdict « pas_assez ».
 */
export function readPost(post: PostNumbers, others: PostNumbers[]): PostReading {
  const mine = postRates(post);
  const othersRates = others.map(postRates);
  const ratios: Partial<Record<Signal, number>> = {};
  let compared = 0;
  for (const k of Object.keys(mine) as Signal[]) {
    const pool = othersRates.map((r) => r[k]).filter((v): v is number => v !== undefined);
    if (pool.length < MIN_COMPARABLE) continue;
    compared = Math.max(compared, pool.length);
    const med = median(pool);
    const v = mine[k] as number;
    if (med === null) continue;
    if (med === 0) {
      if (v > 0) ratios[k] = 2;
      continue;
    }
    ratios[k] = v / med;
  }
  const keys = Object.keys(ratios) as Signal[];
  if (!keys.length) {
    return { verdict: "pas_assez", score: null, ratios, strengths: [], weaknesses: [], howTo: [], compared };
  }
  // Score : moyenne géométrique (un rapport nul compte pour 0,1 pour ne pas tout écraser).
  const score = Math.exp(keys.reduce((s, k) => s + Math.log(Math.max(0.1, ratios[k] as number)), 0) / keys.length);
  const strengths = keys.filter((k) => (ratios[k] as number) >= STRONG_RATIO).sort((a, b) => (ratios[b] as number) - (ratios[a] as number));
  const weaknesses = keys.filter((k) => (ratios[k] as number) <= WEAK_RATIO).sort((a, b) => (ratios[a] as number) - (ratios[b] as number));
  const verdict: Verdict = score >= 1.2 || strengths.length >= 2 ? "a_refaire" : score <= 0.8 ? "en_dessous" : "dans_ta_moyenne";

  const howTo: string[] = [];
  for (const s of strengths.slice(0, 3)) howTo.push(STRENGTH_TIPS[s]);
  // Vue mais peu d'interactions : le sujet attire, la fin est à travailler.
  if (strengths.includes("vues") && weaknesses.some((w) => w === "enregistrements" || w === "partages" || w === "commentaires")) {
    howTo.push("Beaucoup de vues mais peu d'interactions : garde le sujet, travaille la fin (une question, ou une raison de l'enregistrer).");
  }
  for (const w of weaknesses.slice(0, 2)) {
    const tip = WEAKNESS_TIPS[w];
    if (tip && !howTo.includes(tip)) howTo.push(tip);
  }
  return { verdict, score, ratios, strengths, weaknesses, howTo, compared };
}

export interface GroupResult {
  key: string;
  count: number;
  /** Score moyen (1 = dans la moyenne du coach). */
  score: number;
}

/**
 * « Ce qui marche chez toi » : score moyen par groupe (format, type de
 * publication, pilier…), seulement pour les groupes d'au moins 2 publications
 * lues. Trié du meilleur au moins bon.
 */
export function bestGroups(items: { key: string | null; reading: PostReading }[]): GroupResult[] {
  const by = new Map<string, number[]>();
  for (const it of items) {
    if (!it.key || it.reading.score === null) continue;
    const arr = by.get(it.key) ?? [];
    arr.push(it.reading.score);
    by.set(it.key, arr);
  }
  return [...by.entries()]
    .filter(([, xs]) => xs.length >= 2)
    .map(([key, xs]) => ({ key, count: xs.length, score: xs.reduce((a, b) => a + b, 0) / xs.length }))
    .sort((a, b) => b.score - a.score);
}

/** Lit chaque publication contre toutes les autres (laisser-une-de-côté). */
export function readAll<T extends PostNumbers>(posts: T[]): { post: T; reading: PostReading }[] {
  return posts.map((p, i) => ({ post: p, reading: readPost(p, posts.filter((_, j) => j !== i)) }));
}
