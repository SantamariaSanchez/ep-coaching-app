import type { NextConfig } from "next";

// En-têtes de sécurité appliqués à toutes les réponses. Objectif principal :
// réduire la surface de vol du cookie de session (lisible en JS, voir
// lib/auth-cookies.ts pour le détail du compromis).
//
// La CSP reste volontairement permissive sur script-src / connect-src : Next.js
// injecte des scripts inline et l'app parle à Supabase, Stripe et Brevo. Poser
// un script-src strict demanderait une CSP à nonce, à faire dans un second
// temps. Les directives ci-dessous sont, elles, sans risque de régression et
// bloquent de vrais vecteurs d'escalade (iframe piégée, balise base injectée,
// plugin, formulaire détourné vers un domaine tiers).
const CONTENT_SECURITY_POLICY = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  // Force le HTTPS : le cookie de session ne peut plus repartir en clair.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Retour direct 2026-09-10/11 ("je coche, valide, j'attends, ça se
  // décoche" — répété de nombreuses fois, y compris après vérification en
  // base que l'écriture avait bel et bien réussi) : ce `staleTimes.dynamic
  // = 30` avait été posé plus tôt dans la session pour accélérer la
  // navigation (~3s), en pariant que `revalidatePath` purge fiablement le
  // cache client dans TOUTE la fenêtre de 30s, quel que soit le moment de
  // la mutation. AGENTS.md prévient explicitement que ce projet tourne sur
  // une version de Next.js "pas celle que tu connais, avec des
  // changements cassants" — plutôt que de continuer à débugger sur une
  // hypothèse de comportement standard qui ne tient peut-être pas ici,
  // retour à la valeur par défaut de Next.js 15+ pour les pages dynamiques
  // (0 seconde, jamais de cache client) : la fonctionnalité de suivi prime
  // sur 3 secondes de navigation. Si le symptôme persiste après ce
  // retrait, ça écarte définitivement cette piste au lieu de la laisser
  // planer indéfiniment sur chaque futur bug de coche.
  experimental: {
    // Next.js limite le corps d'une Server Action à 1 Mo par défaut —
    // beaucoup trop bas dès qu'un formulaire envoie une photo (onboarding,
    // photos de progression, check-in...). Une photo de téléphone fait
    // souvent 3 à 10 Mo : au-dessus de la bague, la requête est rejetée
    // après avoir uploadé tout le payload sur une connexion mobile, ce qui
    // se traduit par une longue attente puis un échec silencieux côté
    // utilisateur (bug remonté sur l'onboarding, mais qui touchait
    // potentiellement tous les envois de plusieurs photos à la fois).
    // Complété côté client par une compression des photos avant envoi (voir
    // lib/image-compress.ts), cette limite plus haute sert surtout de filet
    // pour les cas où la compression échoue.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
