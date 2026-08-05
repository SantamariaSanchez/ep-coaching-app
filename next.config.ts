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
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
