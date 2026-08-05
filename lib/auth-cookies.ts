import type { CookieOptions } from "@supabase/ssr";

// Durcissement du cookie de session Supabase.
//
// Contexte : `@supabase/ssr` pose ses cookies avec DEFAULT_COOKIE_OPTIONS =
// { path: "/", sameSite: "lax", httpOnly: false, maxAge: 400 jours }. Autrement
// dit, par défaut, aucun flag `secure` et une durée de vie de plus d'un an.
// Ce module centralise les options réellement appliquées partout où l'app
// écrit un cookie d'auth (server client, proxy/middleware, callback OAuth).
//
// Pourquoi httpOnly reste à false : le client navigateur `createBrowserClient`
// lit sa session dans `document.cookie`. Ce projet s'appuie dessus dans une
// vingtaine de composants (temps réel de la messagerie, notifications,
// séances, corrections, déconnexion...). Passer le cookie en httpOnly
// déconnecterait instantanément tout le monde côté client et casserait le
// temps réel. La vraie parade contre le vol par XSS est donc ici :
//   1. `secure` en production : le jeton ne transite jamais en clair.
//   2. `sameSite: lax` : le cookie n'est pas envoyé en contexte tiers.
//   3. durée de vie ramenée de 400 jours à 30 jours : un jeton volé a une
//      fenêtre d'exploitation courte au lieu de plus d'un an.
//   4. en-têtes de sécurité (voir next.config.ts) : `frame-ancestors none`,
//      `object-src none`, `base-uri self`, HSTS, nosniff, Referrer-Policy.
// Pour supprimer complètement la lecture JS du jeton, il faudrait d'abord
// migrer ces composants vers des server actions ou des routes API.

const IS_PROD = process.env.NODE_ENV === "production";

// 30 jours au lieu des 400 jours par défaut de @supabase/ssr.
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

// Passé à `createServerClient({ cookieOptions })` : ces valeurs écrasent les
// défauts de la lib pour tous les cookies d'auth qu'elle génère.
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: IS_PROD,
  httpOnly: false,
};

// @supabase/ssr force son propre maxAge (400 jours) après avoir appliqué
// cookieOptions, on le reclampe donc au moment où l'app écrit vraiment le
// cookie. maxAge 0 = suppression du cookie, à ne surtout pas rallonger.
export function hardenAuthCookie(options: CookieOptions = {}): CookieOptions {
  const maxAge =
    options.maxAge === 0
      ? 0
      : Math.min(options.maxAge ?? SESSION_COOKIE_MAX_AGE, SESSION_COOKIE_MAX_AGE);

  return {
    ...options,
    path: options.path ?? "/",
    sameSite: options.sameSite ?? "lax",
    secure: IS_PROD,
    maxAge,
  };
}
