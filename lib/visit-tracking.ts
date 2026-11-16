// Visites des pages publiques (chantier C64, 2026-11-16) : le haut du tunnel
// n'était mesuré nulle part (pas de Web Analytics, aucun outil). Le minimum
// utile, sans cookie ni donnée personnelle : la page, le site d'où l'on
// vient, la source utm, le jour. Pas d'IP, pas de navigateur, pas
// d'identifiant : une visite = une page vue une fois dans l'onglet.
// Fichier pur, client et serveur.

/** Préfixes jamais comptés : l'appli connectée, l'API, les étapes techniques. */
const PRIVATE_PREFIXES = ["/dashboard", "/equipe", "/api", "/onboarding", "/auth/2fa", "/auth/callback", "/auth/oauth", "/auth/reset-password", "/auth/verifier-email", "/g", "/go"];

export function shouldTrack(path: string): boolean {
  if (!path.startsWith("/") || path.length > 200) return false;
  return !PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Hôte du site d'origine, sans chemin ni paramètres ; null si interne ou illisible. */
export function referrerHost(ref: string | null | undefined, ownHost?: string): string | null {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
    if (!h || (ownHost && h === ownHost.replace(/^www\./, "").toLowerCase())) return null;
    return h.slice(0, 100);
  } catch {
    return null;
  }
}

const UTM_RE = /^[a-z0-9_.-]{1,60}$/i;

export interface VisitInput {
  path?: unknown;
  ref?: unknown;
  utm?: unknown;
}

export interface CleanVisit {
  path: string;
  referrer_host: string | null;
  utm_source: string | null;
}

/** Valide et réduit une visite ; null si elle ne doit pas être enregistrée. */
export function cleanVisit(input: VisitInput, ownHost?: string): CleanVisit | null {
  if (typeof input.path !== "string") return null;
  const path = input.path.split("?")[0].split("#")[0];
  if (!shouldTrack(path)) return null;
  const utm = typeof input.utm === "string" && UTM_RE.test(input.utm) ? input.utm.toLowerCase() : null;
  return { path, referrer_host: referrerHost(typeof input.ref === "string" ? input.ref : null, ownHost), utm_source: utm };
}

/** Groupe lisible d'une page publique pour le tunnel. */
export function visitGroup(path: string): "accueil" | "ressources" | "inscription" | "autre" {
  if (path === "/") return "accueil";
  if (path === "/ressources" || path.startsWith("/ressources/") || path.startsWith("/guides")) return "ressources";
  if (path.startsWith("/auth/client") || path.startsWith("/auth/coach")) return "inscription";
  return "autre";
}

export interface FunnelCounts {
  visits: number;
  resourceVisits: number;
  signupPageVisits: number;
  leads: number;
  candidatures: number;
  signups: number;
  onboarded: number;
}

export interface FunnelStep {
  label: string;
  n: number;
  /** Part de l'étape de référence, en %, ou null si la référence est 0. */
  rate: number | null;
  of: string | null;
}

/**
 * Le tunnel sur une même fenêtre (30 jours). Chaque taux dit sur quoi il est
 * calculé : les visites sont des pages vues par onglet, pas des personnes,
 * donc les taux « sur les visites » sont des ordres de grandeur.
 */
export function funnelSteps(c: FunnelCounts): FunnelStep[] {
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
  return [
    { label: "Visites des pages publiques", n: c.visits, rate: null, of: null },
    { label: "dont guides gratuits", n: c.resourceVisits, rate: pct(c.resourceVisits, c.visits), of: "des visites" },
    { label: "dont page d'inscription", n: c.signupPageVisits, rate: pct(c.signupPageVisits, c.visits), of: "des visites" },
    { label: "Emails laissés (guides)", n: c.leads, rate: pct(c.leads, c.resourceVisits), of: "des visites des guides" },
    { label: "Candidatures coaching", n: c.candidatures, rate: pct(c.candidatures, c.visits), of: "des visites" },
    { label: "Inscriptions à l'appli", n: c.signups, rate: pct(c.signups, c.signupPageVisits), of: "des visites de l'inscription" },
    { label: "Onboarding terminé", n: c.onboarded, rate: pct(c.onboarded, c.signups), of: "des inscrits" },
  ];
}
