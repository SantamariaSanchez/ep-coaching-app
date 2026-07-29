// Abonnement plateforme pour les coachs tiers qui utilisent EP Coaching
// pour suivre leurs propres clients (distinct de l'abonnement d'un CLIENT
// à son coach, voir lib/subscription-plans.ts).
//
// ⚠️ À CONFIGURER : le prix et l'URL ci-dessous sont des valeurs provisoires.
// Il faut créer un vrai Payment Link Stripe (Dashboard Stripe > Payment Links)
// pour ce plan, avec le prix souhaité, puis remplacer COACH_PLATFORM_PLAN.url
// par ce lien. Le Payment Link doit être configuré pour transmettre
// client_reference_id (sinon le webhook ne saura pas quel coach activer).
export const COACH_PLATFORM_PLAN = {
  id: "coach_platform",
  label: "Abonnement coach",
  priceLabel: "97€ / mois",
  sublabel: "Accès complet à l'outil pour suivre tes propres clients",
  url: "https://buy.stripe.com/REMPLACE_MOI",
} as const;
