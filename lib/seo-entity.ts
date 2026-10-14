import { SANTAMARIA_SOCIALS } from "@/lib/brand-links";

// Identité publique d'EP Coaching pour les moteurs de recherche et les IA
// (2026-10-13). Avant, les seules pages qui disaient « Annecy » et qui
// présentaient l'entreprise étaient les CGU/CGV : Google les sortait en
// premier sur « EP Coaching Annecy » ou le nom du fondateur. Une seule
// source pour toutes les pages publiques, uniquement des faits vérifiés
// (mentions légales, page À propos du site).

export const SITE_URL = "https://ep-coaching.vercel.app";
export const SHOWCASE_URL = "https://santamariasanchez.github.io/EPCoaching/";

// Nom public : « Emmanuel Santamaria Sanchéz » (avec l'accent). Le nom légal
// n'apparaît que dans les mentions légales, CGU, CGV et factures.
export const FOUNDER = {
  name: "Emmanuel Santamaria Sanchéz",
  alternateName: "Santamaria Sanchéz",
  jobTitle: "Coach sportif en musculation et nutrition, fondateur d'EP Coaching",
  bio: "Athlète naturel, objectif Heroes Cup WNBF France en Classic Physique. Accompagne des personnes qui veulent progresser en musculation et des coachs qui veulent structurer leur activité.",
};

export const PLACE = {
  city: "Annecy",
  postalCode: "74600",
  region: "Haute-Savoie",
  country: "FR",
  // Communes voisines citées dans le texte des pages locales.
  around: ["Annecy-le-Vieux", "Seynod", "Cran-Gevrier", "Meythet", "Pringy", "Épagny Metz-Tessy", "Sevrier", "Rumilly", "Faverges"],
};

/** Fonctionnalités réelles de l'appli (texte des pages publiques et JSON-LD). */
export const APP_FEATURES = [
  "Programme de musculation sur mesure",
  "Plan nutrition et calcul des macros",
  "Bilans quotidiens et check-ins hebdomadaires",
  "Messagerie et appels avec le coach",
  "Carnet de séances et records",
  "Suivi du poids, des photos et des mensurations",
  "Guides gratuits sur l'entraînement et la nutrition",
  "Espace coach : suivi des clients, Studio de contenu, stats réseaux, ventes et équipe",
];

const address = {
  "@type": "PostalAddress",
  addressLocality: PLACE.city,
  postalCode: PLACE.postalCode,
  addressRegion: PLACE.region,
  addressCountry: PLACE.country,
};

const founderNode = {
  "@type": "Person",
  "@id": `${SITE_URL}/a-propos#fondateur`,
  name: FOUNDER.name,
  alternateName: FOUNDER.alternateName,
  jobTitle: FOUNDER.jobTitle,
  description: FOUNDER.bio,
  url: `${SITE_URL}/a-propos`,
  homeLocation: { "@type": "Place", name: `${PLACE.city}, ${PLACE.region}`, address },
  knowsAbout: ["Musculation", "Bodybuilding naturel", "Nutrition sportive", "Coaching en ligne", "Prise de masse", "Perte de gras"],
  sameAs: [...SANTAMARIA_SOCIALS],
};

/** Graphe complet : entreprise locale, fondateur, site, appli. */
export function entityGraph(extra: object[] = []) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": `${SITE_URL}/#entreprise`,
        name: "EP Coaching",
        alternateName: ["EP Coaching Annecy", "EP Coaching Santamaria Sanchéz"],
        slogan: "Un accompagnement qui s'adapte à toi.",
        url: SITE_URL,
        logo: `${SITE_URL}/icon-512.png`,
        image: `${SITE_URL}/og-image.jpg`,
        description:
          "EP Coaching, coaching sportif en musculation et nutrition basé à Annecy, accompagnement en ligne partout en France via l'appli EP Coaching. Fondé par Emmanuel Santamaria Sanchéz.",
        address,
        areaServed: [
          { "@type": "City", name: "Annecy" },
          { "@type": "AdministrativeArea", name: "Haute-Savoie" },
          { "@type": "Country", name: "France" },
        ],
        founder: { "@id": founderNode["@id"] },
        sameAs: [...SANTAMARIA_SOCIALS, SHOWCASE_URL],
        knowsAbout: founderNode.knowsAbout,
      },
      founderNode,
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#site`,
        name: "EP Coaching",
        url: SITE_URL,
        inLanguage: "fr-FR",
        publisher: { "@id": `${SITE_URL}/#entreprise` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#appli`,
        name: "EP Coaching",
        applicationCategory: "HealthApplication",
        applicationSubCategory: "Coaching sportif, musculation et nutrition",
        operatingSystem: "Web, iOS, Android",
        url: SITE_URL,
        inLanguage: "fr-FR",
        description:
          "Appli de coaching sportif : programme de musculation, plan nutrition, bilans, messagerie avec le coach et suivi des progrès. Pour les coachs : suivi de leurs propres clients, contenu, ventes et équipe.",
        featureList: APP_FEATURES,
        // Seuls prix publics (grille 2026-09-16) : appli gratuite pour
        // commencer, formules coach Standard et Premium.
        offers: [
          { "@type": "Offer", name: "Accès gratuit", price: "0", priceCurrency: "EUR" },
          { "@type": "Offer", name: "Coach Standard", price: "20", priceCurrency: "EUR", category: "Abonnement mensuel, sans engagement" },
          { "@type": "Offer", name: "Coach Premium", price: "200", priceCurrency: "EUR", category: "Abonnement mensuel, sans engagement" },
        ],
        publisher: { "@id": `${SITE_URL}/#entreprise` },
      },
      ...extra,
    ],
  };
}

export function faqNode(faqs: readonly { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

/** Référence vers le fondateur, à réutiliser comme auteur (guides). */
export const FOUNDER_REF = { "@id": `${SITE_URL}/a-propos#fondateur` };

export function breadcrumbNode(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}
