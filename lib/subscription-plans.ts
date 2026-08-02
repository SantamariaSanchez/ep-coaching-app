// EP Coaching Premium — même offre, 3 engagements différents.
export const SUBSCRIPTION_PLANS = [
  {
    id: "monthly",
    label: "Mensuel",
    priceLabel: "500€ / mois",
    sublabel: "Sans engagement",
    url: "https://buy.stripe.com/dRmbJ1cSn3uj5bK2XpfIs08",
    highlight: false,
  },
  {
    id: "quarterly",
    label: "6 mois (1 fois)",
    priceLabel: "3000€ paiement unique",
    sublabel: "Couvre 6 mois, sans renouvellement auto",
    url: "https://buy.stripe.com/dRm4gz3hNgh57jS8hJfIs06",
    highlight: false,
  },
  {
    id: "semiannual",
    label: "Semestriel",
    priceLabel: "1500€ / 6 mois",
    sublabel: "= 250€/mois, meilleure offre",
    url: "https://buy.stripe.com/fZueVdaKf5Cr5bKbtVfIs07",
    highlight: true,
  },
] as const;
