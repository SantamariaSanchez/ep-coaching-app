// Abonnement plateforme pour les coachs tiers qui utilisent EP Coaching
// pour suivre leurs propres clients (distinct de l'abonnement d'un CLIENT
// à son coach, voir lib/subscription-plans.ts). 2 mois d'essai gratuit sur
// les deux formules (configuré directement sur les Price Stripe).
export const COACH_PLATFORM_PLANS = [
  {
    id: "monthly",
    label: "Mensuel",
    priceLabel: "100€ / mois",
    sublabel: "2 mois d'essai gratuit, sans engagement",
    url: "https://buy.stripe.com/9B67sLg4z5Cr33C0PhfIs04",
  },
  {
    id: "semiannual",
    label: "Semestriel",
    priceLabel: "480€ / 6 mois",
    sublabel: "= 80€/mois, 2 mois d'essai gratuit",
    url: "https://buy.stripe.com/cNi28r2dJ9SH7jS8hJfIs05",
  },
] as const;
