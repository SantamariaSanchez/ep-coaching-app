export const POSING_CATEGORIES: Record<
  string,
  {
    mandatory_poses: string[];
    posing_routine: { duration: string; instructions: string };
    notes: string;
  }
> = {
  "Classic Physique": {
    mandatory_poses: [
      "Front Double Biceps",
      "Front Lat Spread",
      "Side Chest (côté fort)",
      "Back Double Biceps",
      "Back Lat Spread",
      "Side Triceps (côté fort)",
      "Abdominaux & Cuisses",
      "Pose classique favorite 1",
      "Pose classique favorite 2",
    ],
    posing_routine: {
      duration: "60 secondes max",
      instructions:
        "Routine libre mettant en valeur symétrie et esthétique classique. Transitions fluides entre les poses. Pas de poses bodybuilding ou Most Muscular.",
    },
    notes: "Emphase sur symétrie et présentation. Tronc court 4.5\" max.",
  },
  "Men's Physique": {
    mandatory_poses: [
      "Quarter Turn Face",
      "Quarter Turn Côté Droit",
      "Quarter Turn Dos",
      "Quarter Turn Côté Gauche",
      "Front Relaxed (mains sur hanches)",
      "Back Relaxed (mains sur hanches)",
    ],
    posing_routine: {
      duration: "30-60 secondes",
      instructions:
        "Présentation en boardshorts. Pas de poses musculaires bodybuilding. Accent sur physique athlétique et présence scénique.",
    },
    notes: "Boardshorts obligatoires. Look athlétique, pas extrême.",
  },
  "Men's Bodybuilding": {
    mandatory_poses: [
      "Front Double Biceps",
      "Front Lat Spread",
      "Side Chest (côté fort)",
      "Back Double Biceps",
      "Back Lat Spread",
      "Side Triceps (côté fort)",
      "Abdominaux & Cuisses",
      "Most Muscular",
    ],
    posing_routine: {
      duration: "60 secondes max",
      instructions:
        "Routine libre maximisant la présentation musculaire. Toutes les poses autorisées.",
    },
    notes: "Conditionnement extrême valorisé. Tronc standard.",
  },
  Bikini: {
    mandatory_poses: [
      "Quarter Turn Face (main sur hanche)",
      "Quarter Turn Côté Droit",
      "Quarter Turn Dos (main sur hanche)",
      "Quarter Turn Côté Gauche",
    ],
    posing_routine: {
      duration: "30 secondes max",
      instructions:
        "Walk scénique avec 1 pose obligatoire par point. Poses tenues 3 secondes max. Chaussures requises.",
    },
    notes:
      "Look fit et féminin, pas trop musclé. Bikini 2 pièces traditionnel.",
  },
  Figure: {
    mandatory_poses: [
      "Quarter Turn Face",
      "Quarter Turn Côté Droit",
      "Quarter Turn Dos",
      "Quarter Turn Côté Gauche",
    ],
    posing_routine: {
      duration: "30 secondes max",
      instructions:
        "Quarter turns uniquement. Jugé sur symétrie, tonus et présence scénique. Walk scénique structuré.",
    },
    notes:
      "Balance égale haut/bas du corps. Aucune partie ne doit dominer.",
  },
  "Fit Body": {
    mandatory_poses: [
      "Quarter Turn Face",
      "Quarter Turn Côté Droit",
      "Quarter Turn Dos",
      "Quarter Turn Côté Gauche",
      "Front Athletic Pose",
      "Back Athletic Pose",
    ],
    posing_routine: {
      duration: "45 secondes max",
      instructions:
        "Présentation athlétique. Entre Bikini et Figure en termes de musculature.",
    },
    notes: "Look athlétique féminin valorisé.",
  },
};

export const ALL_CATEGORIES = Object.keys(POSING_CATEGORIES);

export type SubmissionType = "mandatory_poses" | "posing_routine" | "video_perf";

export const TYPE_LABELS: Record<SubmissionType, string> = {
  mandatory_poses: "Poses Obligatoires",
  posing_routine: "Routine Posing",
  video_perf: "Performance / Autre",
};
