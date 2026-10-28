// Connexion sociale (Google, Apple) : constantes et petits utilitaires
// partagés entre les routes /auth/oauth/*, les boutons et l'appli native.
// Aucune clé ici : les fournisseurs se règlent dans Supabase (Authentication
// > Providers), voir la page Notion « Activer Google et Apple Sign-In ».

export const OAUTH_PROVIDERS = ["google", "apple"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
export type OAuthRole = "client" | "coach";

/** Cookie court (10 min) qui garde le contexte pendant l'aller-retour chez Google/Apple. */
export const OAUTH_CTX_COOKIE = "ep_oauth_ctx";
export const OAUTH_CTX_MAX_AGE = 600;

export interface OAuthCtx {
  role: OAuthRole;
  /** Code d'invitation du coach (?coach=...). */
  coach?: string;
  /** Code de parrainage (?ref=...). */
  ref?: string;
}

export function parseProvider(v: string | null | undefined): OAuthProvider | null {
  return (OAUTH_PROVIDERS as readonly string[]).includes(v ?? "") ? (v as OAuthProvider) : null;
}

export function parseRole(v: string | null | undefined): OAuthRole {
  return v === "coach" ? "coach" : "client";
}

/** Codes d'invitation / parrainage : lettres et chiffres uniquement, jamais de caractère libre. */
export function cleanInviteCode(v: string | null | undefined): string | undefined {
  const s = (v ?? "").trim();
  return /^[A-Za-z0-9]{3,32}$/.test(s) ? s : undefined;
}

export function encodeCtx(ctx: OAuthCtx): string {
  return encodeURIComponent(JSON.stringify(ctx));
}

export function decodeCtx(raw: string | null | undefined): OAuthCtx {
  try {
    const o = JSON.parse(decodeURIComponent(raw ?? "")) as Partial<OAuthCtx>;
    return { role: parseRole(o.role), coach: cleanInviteCode(o.coach), ref: cleanInviteCode(o.ref) };
  } catch {
    return { role: "client" };
  }
}

export type OAuthErrorCode =
  | "provider_disabled"
  | "cancelled"
  | "failed"
  | "not_coach"
  | "no_email"
  | "rate_limited"
  | "profile_failed";

// Messages affichés sous les boutons (clés du dictionnaire anglais).
export const OAUTH_ERROR_MESSAGES: Record<OAuthErrorCode, string> = {
  provider_disabled: "Cette connexion n'est pas encore activée. Utilise ton e-mail pour l'instant, ça prend 30 secondes.",
  cancelled: "Connexion annulée. Tu peux réessayer ou utiliser ton e-mail.",
  failed: "La connexion n'a pas abouti. Réessaie ou utilise ton e-mail.",
  not_coach: "Ce compte n'est pas un compte coach. Connecte-toi depuis l'espace membre.",
  no_email: "Ton fournisseur n'a pas transmis d'adresse e-mail. Utilise l'inscription par e-mail.",
  rate_limited: "Trop de tentatives. Réessaie dans un moment.",
  profile_failed: "Ton compte n'a pas pu être créé. Réessaie dans un instant.",
};

export function oauthErrorPath(role: OAuthRole, code: OAuthErrorCode): string {
  return role === "coach" ? `/auth/coach?oauth_error=${code}` : `/auth/client?mode=login&oauth_error=${code}`;
}

/** Lien profond de retour vers l'appli native (voir NativeBridge). */
export const NATIVE_DEEP_LINK = "epcoaching://app/auth/oauth/native";
