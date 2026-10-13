import { SANTAMARIA_SOCIALS } from "@/lib/brand-links";

// Identité publique d'EP Coaching pour les moteurs de recherche et les IA
// (2026-10-13). Avant, les seules pages qui disaient « Annecy » et qui
// présentaient l'entreprise étaient les CGU/CGV : Google les sortait en
// premier sur « EP Coaching Annecy » ou le nom du fondateur. Une seule
// source pour toutes les pages publiques, uniquement des faits vérifiés
// (mentions légales, page À propos du site).

export const SITE_URL = "https://ep-coaching.vercel.app";
export const SHOWCASE_URL = "https://santamariasanchez.github.io/EPCoaching/";

export const FOUNDER = {
  name: "Santamaria Sanchéz",
  alternateName: "Santamaria Sanchez",
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
        url: SITE_URL,
        logo: `${SITE_URL}/icon-512.png`,
        image: `${SITE_URL}/og-image.jpg`,
        description:
          "EP Coaching, coaching sportif en musculation et nutrition basé à Annecy, accompagnement en ligne partout en France via l'appli EP Coaching. Fondé par Santamaria Sanchéz.",
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
        name: "EP Coaching",
        applicationCategory: "HealthApplication",
        operatingSystem: "Web, iOS, Android",
        url: SITE_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
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

export function breadcrumbNode(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}
