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
    amount: 20,
    priceLabel: "20€ / mois",
    sublabel: "Tout le suivi de tes clients, sans engagement",
    url: "https://buy.stripe.com/dRm7sL9Gb7Kz47G1TlfIs09",
  },
  {
    id: "premium",
    label: "Premium",
    amount: 200,
    priceLabel: "200€ / mois",
    sublabel: "Suivi, contenu, formations, lives et IA, sans engagement",
    url: "https://buy.stripe.com/4gMbJ19Gb3uj5bK41tfIs0a",
  },
] as const;

// Accès gratuit coach (décision du fondateur 2026-10-09 : 0 € de
// CA, la priorité est d'avoir des coachs qui utilisent l'appli et font des
// retours). Gratuit, clients illimités (aucun plafond dans le code), en
// échange de retours réguliers. Pas de Stripe : le compte est activé
// directement à l'inscription.
export const COACH_TESTER_PLAN = {
  id: "testeur",
  label: "Accès gratuit",
  priceLabel: "0 €",
  sublabel: "Clients illimités, en échange de tes retours",
} as const;

// Contenu des cartes d'offre coach (retour du fondateur 2026-10-14 : « le
// prix de 20 €, il faut une belle card avec tout ce qui est compris, pareil
// pour 200 €, et pas justifier seulement avec IA illimitée »). Construit sur
// l'équation de valeur (résultat voulu, probabilité perçue, délai, effort)
// et formulé en bénéfices. RÈGLE : chaque ligne correspond à une
// fonctionnalité qui existe vraiment dans l'appli (vérifiée dans le code le
// 2026-10-14), aucun chiffre ni témoignage inventé. Découpage décidé par le
// fondateur le 2026-10-15 et appliqué dans l'appli (lib/coach-tier.ts) :
// Standard = le suivi des clients ; Premium = en plus la création de
// contenu, les 5 formations, les lives et l'IA.
export interface CoachPlanFeature {
  title: string;
  detail: string;
}

export interface CoachPlanDetails {
  /** Nom parlant de l'offre, affiché sous le nom de formule (Standard/Premium). */
  offerName: string;
  forWho: string;
  promise: string;
  /** Phrase qui précède la liste (ex. « Tout Standard, plus : »). */
  includesIntro: string | null;
  includes: CoachPlanFeature[];
  ctaLabel: string;
  badge: string | null;
}

export const COACH_PLAN_DETAILS: Record<"standard" | "premium", CoachPlanDetails> = {
  standard: {
    offerName: "Suivi Pro",
    forWho: "Tu suis déjà des clients et tu perds des heures entre WhatsApp, tableurs et PDF.",
    promise: "Tous tes clients suivis au même endroit, et chaque matin tu sais qui a besoin de toi.",
    includesIntro: null,
    includes: [
      {
        title: "Programmes, diètes et road maps en quelques minutes",
        detail: "Une base complète générée depuis la fiche du client, tes modèles réutilisables, et tu ajustes.",
      },
      {
        title: "Les alertes qui te disent qui décroche",
        detail: "Check-in manquant, séances sautées, repas non notés, poids qui stagne : tu le vois avant que ton client lâche.",
      },
      {
        title: "Tout le suivi d'un client sur une seule fiche",
        detail: "Bilans du jour, check-ins, photos, mensurations, carnet de séances et records.",
      },
      {
        title: "Messagerie, agenda et check-ins guidés",
        detail: "Tu échanges avec tes clients, ils reçoivent les notifications sur leur téléphone, tu fais tes retours en vidéo ou en vocal.",
      },
      {
        title: "Documents, notes et bibliothèque",
        detail: "Contrats types, fichiers, notes, exercices, recettes et plus de 1000 guides gratuits à envoyer à tes clients.",
      },
    ],
    ctaLabel: "Choisir Standard",
    badge: null,
  },
  premium: {
    offerName: "Business complet",
    forWho: "Tu veux plus de clients, pas seulement mieux suivre ceux que tu as.",
    promise: "Ton suivi, ton contenu, tes ventes et ton équipe pilotés depuis une seule appli, avec des chiffres au lieu du ressenti.",
    includesIntro: "Tout Standard, plus :",
    includes: [
      {
        title: "Toute ta création de contenu",
        detail: "Studio créatif, scripts et prompteur, ta niche et ton avatar, et tes stats Instagram reliées à tes scripts.",
      },
      {
        title: "Les 5 formations EP",
        detail: "Bodybuilding, nutrition, entraînement, business et psychologie, à suivre à ton rythme.",
      },
      {
        title: "L'accès aux lives",
        detail: "Coaching live, ateliers et questions-réponses en direct.",
      },
      {
        title: "L'IA qui travaille pour toi",
        detail: "Un assistant qui repère chaque jour tes clients à risque et les relance, et Claude relié à ton appli et à Notion.",
      },
      {
        title: "Tes ventes pilotées avec des chiffres",
        detail: "Appels de vente et closing, suivi de tes pubs, revenus et dépenses : tu sais ce qui rapporte.",
      },
      {
        title: "Mailing à tes clients",
        detail: "Annonces, relances et newsletter envoyées depuis l'appli.",
      },
      {
        title: "Tes formations à vendre et ton équipe",
        detail: "Formations vidéo avec ton lien de paiement, coachs, setter ou closer invités, paie calculée sur les vraies ventes.",
      },
      {
        title: "Masterclass business",
        detail: "Des guides pas à pas (Notion, Stripe, Claude, outils) pour monter ton business.",
      },
    ],
    ctaLabel: "Choisir Premium",
    badge: "Le plus complet",
  },
};

/** Ce qui change entre les deux formules, en un coup d'œil. */
export const COACH_PLAN_COMPARISON: { label: string; standard: boolean; premium: boolean }[] = [
  { label: "Suivi complet de tes clients", standard: true, premium: true },
  { label: "Modèles de programmes, diètes et road maps", standard: true, premium: true },
  { label: "Alertes sur les clients qui décrochent", standard: true, premium: true },
  { label: "Messagerie, agenda et check-ins guidés", standard: true, premium: true },
  { label: "Création de contenu (Studio, stats Instagram, niche)", standard: false, premium: true },
  { label: "Les 5 formations EP", standard: false, premium: true },
  { label: "Accès aux lives", standard: false, premium: true },
  { label: "IA : assistant de relance et Claude", standard: false, premium: true },
  { label: "Ventes, mailing, formations à vendre et équipe", standard: false, premium: true },
];

/** Uniquement des engagements réels (CGV articles 4, 9 et 10, webhook Stripe). */
export const COACH_PLAN_REASSURANCE: string[] = [
  "Sans engagement : tu arrêtes quand tu veux, 7 jours avant l'échéance.",
  "Prix fixe, quel que soit ton nombre de clients.",
  "Paiement sécurisé par Stripe, ton espace s'ouvre dès le paiement.",
  "Tes clients restent les tiens : aucun autre coach ne voit leurs données.",
];
