// Nettoyage et validation des saisies utilisateur, côté serveur uniquement.
//
// Rappel important sur l'architecture de cette app : une grande partie des
// écritures part directement du navigateur vers PostgREST (client Supabase
// anon + RLS), sans passer par une route API ou une server action. Une
// validation écrite ici ne protège donc QUE les chemins qui passent
// réellement par le serveur. Le vrai garde-fou universel sur les longueurs et
// les bornes numériques, c'est la contrainte CHECK en base (voir la migration
// 20260805k_input_hardening_constraints.sql) : elle s'applique aussi bien à
// une requête forgée vers PostgREST qu'à un appel légitime depuis l'appli.
//
// Ces helpers restent utiles pour deux raisons :
//   1. renvoyer un message clair à l'utilisateur avant de taper la base ;
//   2. couvrir ce qui ne vit pas en base (prompts IA, emails, URLs rendues).

// ── Longueurs de référence ────────────────────────────────────────────────
// Volontairement larges : un usage normal ne doit jamais les atteindre.
// Elles sont alignées sur les CHECK posées en base.
export const LIMITS = {
  name: 120,
  shortText: 300,
  handle: 60,
  phone: 40,
  url: 2000,
  message: 5000,
  post: 5000,
  comment: 3000,
  bio: 2000,
  note: 10000,
  longForm: 20000,
  searchQuery: 200,
} as const;

// Retire les caractères de contrôle, qui n'ont aucune raison d'être dans une
// saisie et cassent l'affichage comme les logs. Tabulation, retour chariot et
// saut de ligne sont conservés : ils sont légitimes dans un texte multi lignes.
function stripControlChars(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    const isAllowedWhitespace = code === 9 || code === 10 || code === 13;
    if (code === 127) continue;
    if (code < 32 && !isAllowedWhitespace) continue;
    out += ch;
  }
  return out;
}

// Coupe une chaîne à la longueur maximale et normalise les espaces de bord.
// Renvoie null si la chaîne est vide après nettoyage.
export function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = stripControlChars(value).trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

// Variante stricte : renvoie une erreur au lieu de tronquer silencieusement,
// pour les endpoints où l'on préfère refuser une charge manifestement forgée.
export function requireText(
  value: unknown,
  maxLength: number,
  label: string
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: `${label} est requis.` };
  }
  const cleaned = cleanText(value, maxLength + 1);
  if (!cleaned) {
    return { ok: false, error: `${label} est requis.` };
  }
  if (cleaned.length > maxLength) {
    return { ok: false, error: `${label} est trop long (${maxLength} caractères max).` };
  }
  return { ok: true, value: cleaned };
}

// ── Nombres ───────────────────────────────────────────────────────────────
// Valide qu'une valeur est bien un nombre fini dans des bornes raisonnables.
// Renvoie null si la valeur est absente ou hors bornes : l'appelant décide
// alors s'il refuse la requête ou s'il ignore simplement le champ.
export function cleanNumber(
  value: unknown,
  { min, max, integer = false }: { min: number; max: number; integer?: boolean }
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return integer ? Math.round(n) : n;
}

// ── URLs ──────────────────────────────────────────────────────────────────
// Un champ "lien" rempli par un utilisateur finit dans un href. Sans filtre,
// `javascript:alert(document.cookie)` s'exécute dans la session de celui qui
// clique (souvent le coach). On n'autorise donc que http/https, et on refuse
// tout le reste (javascript:, data:, vbscript:, file:...).
const SAFE_URL_SCHEMES = new Set(["http:", "https:"]);

export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > LIMITS.url) return null;
  // Un chemin interne relatif est sûr et fréquent (notifications, ressources).
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (!SAFE_URL_SCHEMES.has(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

// ── HTML ──────────────────────────────────────────────────────────────────
// React échappe tout seul ce qu'il rend, mais pas les emails que l'on
// construit à la main en concaténant du HTML. Un nom d'inscription du type
// `<a href="...">Clique ici</a>` arriverait tel quel dans la boîte du coach.
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ── Motifs PostgREST ──────────────────────────────────────────────────────
// `.ilike()` interprète % et _ comme des jokers. Interpoler une valeur
// utilisateur brute dans un motif laisse construire une requête qui matche
// n'importe quelle ligne. On échappe donc les métacaractères.
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
