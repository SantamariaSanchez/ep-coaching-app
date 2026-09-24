// Grille 2026-09-16 : deux services de coaching distincts dispensés
// personnellement par Santamaria (voir memory project_pricing_2026-09-16),
// plus vente manuelle/appel de vente qu'auto-service (SubscriptionToggle
// choisit juste un label pour la fiche client, aucun composant ne redirige
// vers `url` aujourd'hui — contrairement à lib/coach-platform-plan.ts).
export const SUBSCRIPTION_PLANS = [
  {
    id: "physique",
    label: "Coaching individuel physique",
    priceLabel: "200€ / mois",
    sublabel: "Transformation physique, sans engagement",
    url: "https://buy.stripe.com/dRm28r9Gb2qf1Zy0PhfIs0b",
    highlight: false,
  },
  {
    id: "business",
    label: "Coaching business",
    priceLabel: "500€ / mois",
    sublabel: "Lancer ou scaler son activité de coach, sans engagement",
    url: "https://buy.stripe.com/28EbJ12dJ7Kz9s07dFfIs0c",
    highlight: true,
  },
] as const;
