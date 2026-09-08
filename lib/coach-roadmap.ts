// Roadmap business personnelle du coach — vision et jalons sur 4 horizons.
// Demande directe 2026-09-08 : "la road map business plan sur 1 3 10 20
// ans". Distincte de la Road Map du CLIENT (utils/roadmap.ts, objectifs
// physiques) : celle-ci est le plan de carrière du coach lui-même, dans le
// même esprit que le funnel TOF/MOF/BOF et la checklist de lib/coach-business.ts,
// mais sur le temps long plutôt que sur le contenu du moment.

export const ROADMAP_HORIZONS = ["1_an", "3_ans", "10_ans", "20_ans"] as const;
export type RoadmapHorizon = (typeof ROADMAP_HORIZONS)[number];

export interface RoadmapHorizonInfo {
  key: RoadmapHorizon;
  label: string;
  /** Question posée pour orienter ce que le coach doit écrire dans sa vision — chaque horizon appelle un ordre de grandeur différent, pas juste "plus tard". */
  prompt: string;
  placeholder: string;
  /** Exemples de jalons pour amorcer la réflexion — jamais insérés automatiquement, juste affichés comme repère. */
  examples: string[];
}

export const ROADMAP_HORIZON_INFO: Record<RoadmapHorizon, RoadmapHorizonInfo> = {
  "1_an": {
    key: "1_an",
    label: "1 an",
    prompt: "Concrètement, à quoi ressemble ton activité dans 12 mois ?",
    placeholder: "Ex : X clients actifs, un rythme de contenu tenu, un système de qualification en place...",
    examples: [
      "Nombre de clients actifs visé",
      "Revenu mensuel visé",
      "Un rythme de publication tenu sur 12 mois sans interruption",
    ],
  },
  "3_ans": {
    key: "3_ans",
    label: "3 ans",
    prompt: "Qu'est-ce qui doit tourner sans toi à 100 % dessus en permanence ?",
    placeholder: "Ex : des process écrits, peut-être un premier recrutement, une marque reconnue sur ta niche...",
    examples: [
      "Un ou plusieurs process délégables ou automatisés",
      "Une spécialisation claire, reconnue sur le marché",
      "Un premier recrutement si le volume le justifie",
    ],
  },
  "10_ans": {
    key: "10_ans",
    label: "10 ans",
    prompt: "À quoi ressemble l'entreprise, pas juste toi en train de coacher ?",
    placeholder: "Ex : une équipe, plusieurs sources de revenu, une marque qui dépasse ta seule personne...",
    examples: [
      "Plusieurs sources de revenu (coaching, formation, produit...)",
      "Une équipe en place, pas seulement toi",
      "Une marque qui a une valeur indépendamment de ta présence au quotidien",
    ],
  },
  "20_ans": {
    key: "20_ans",
    label: "20 ans",
    prompt: "Qu'est-ce qui reste si tu t'arrêtes demain ?",
    placeholder: "Ex : indépendance financière atteinte, un héritage transmis, un impact qui te dépasse...",
    examples: [
      "Indépendance financière atteinte",
      "Une entreprise transmissible ou cessible",
      "Un impact ou une méthode qui te survit",
    ],
  },
};
