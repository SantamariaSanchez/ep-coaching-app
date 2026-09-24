// Abonnement plateforme pour les coachs tiers qui utilisent EP Coaching
// pour suivre leurs propres clients (distinct de l'abonnement d'un CLIENT
// à son coach, voir lib/subscription-plans.ts). Grille 2026-09-16 (memory
// project_pricing_2026-09-16) : Standard vs Premium remplace l'ancien
// mensuel/semestriel — seuls ces 2 prix (SaaS) peuvent être affichés
// publiquement, jamais le coaching individuel/business ni les formations.
// Décision du fondateur 2026-09-24 : pas d'essai gratuit sur ces nouveaux
// Price Stripe, contrairement à l'ancienne grille (2 mois offerts). Retiré
// aussi des CGV, de CoachSignupFlow.tsx et de MyPlatformSubscriptionCard.tsx.
export const COACH_PLATFORM_PLANS = [
  {
    id: "standard",
    label: "Standard",
    priceLabel: "20€ / mois",
    sublabel: "Suivi complet dans l'app, sans engagement",
    url: "https://buy.stripe.com/dRm7sL9Gb7Kz47G1TlfIs09",
  },
  {
    id: "premium",
    label: "Premium",
    priceLabel: "200€ / mois",
    sublabel: "IA illimitée + formations incluses, sans engagement",
    url: "https://buy.stripe.com/4gMbJ19Gb3uj5bK41tfIs0a",
  },
] as const;
