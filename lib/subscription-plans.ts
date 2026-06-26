// EP Coaching Premium — même offre, 3 engagements différents.
export const SUBSCRIPTION_PLANS = [
  {
    id: "monthly",
    label: "Mensuel",
    priceLabel: "220€ / mois",
    sublabel: "Sans engagement",
    url: "https://buy.stripe.com/eVq8wPcSnaWL33C2XpfIs01",
    highlight: false,
  },
  {
    id: "quarterly",
    label: "Trimestriel",
    priceLabel: "600€ / 3 mois",
    sublabel: "= 200€/mois",
    url: "https://buy.stripe.com/00wcN5cSn5CrdIg8hJfIs00",
    highlight: false,
  },
  {
    id: "semiannual",
    label: "Semestriel",
    priceLabel: "1000€ / 6 mois",
    sublabel: "= ~167€/mois — meilleure offre",
    url: "https://buy.stripe.com/9B6aEX7y39SH8nWbtVfIs02",
    highlight: true,
  },
] as const;
