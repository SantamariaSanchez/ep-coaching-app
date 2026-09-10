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
  // Perf (repasse masterclass 2026-09-10, retour direct : "changer d'onglet
  // prend 3s") : toutes les pages du dashboard sont force-dynamic (cookies
  // de session), donc par défaut Next.js 15+ les traite comme staleTimes
  // "dynamic" = 0 seconde — chaque navigation, même vers un onglet visité
  // il y a 2 secondes, refait un aller-retour serveur complet plutôt que de
  // réutiliser le rendu déjà en cache côté client. Remonter cette fenêtre à
  // 30s est sûr ICI précisément parce que la discipline `revalidatePath`
  // après mutation a déjà été auditée en profondeur (MASTERCLASS.md Axe A,
  // ~78 fichiers d'action passés en revue, 0 lacune trouvée y compris lors
  // de la repasse du 2026-09-10) : la documentation Next.js confirme que
  // revalidatePath purge explicitement ce cache client, quelle que soit
  // staleTimes ("Server Functions: ... causes all previously visited pages
  // to refresh when navigated to again") — donc aucun retour du bug
  // "coché puis décoché" déjà corrigé. Seul residual : une donnée modifiée
  // depuis un AUTRE appareil/session peut rester affichée jusqu'à 30s sur
  // cet onglet-ci avant refresh manuel — compromis raisonnable pour une
  // appli de coaching, pas un système transactionnel temps réel.
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
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
