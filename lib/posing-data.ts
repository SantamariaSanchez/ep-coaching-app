export interface PosingCategoryData {
  gender: "homme" | "femme";
  mandatory_poses: string[];
  posing_routine: { duration: string; instructions: string };
  notes: string;
  // Astuces générales de posing pour la catégorie — but que l'espace photo
  // ne se limite pas à "dépose une photo" mais serve aussi à progresser.
  tips: string[];
}

export const POSING_CATEGORIES: Record<string, PosingCategoryData> = {
  "Classic Physique": {
    gender: "homme",
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
    tips: [
      "Enchaîne les poses sans temps mort, chaque transition doit rester gracieuse, jamais brusque.",
      "Contracte 1-2 secondes avant que le mouvement soit terminé, pas après : ça donne l'impression que la pose est déjà là.",
      "Respire en réserve pendant les poses statiques, bloquer sa respiration tire des grimaces qui cassent la prestation.",
      "Entraîne-toi devant un miroir en pointant les mêmes repères visuels (cadre de porte, ligne au sol) pour reproduire un cadrage identique à chaque photo de suivi.",
    ],
  },
  "Men's Physique": {
    gender: "homme",
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
    tips: [
      "Le quarter turn se marche, ne se pivote pas sec sur place, un vrai pas de côté donne une ligne plus longue.",
      "Épaules basses et relâchées : la tension dans le trapèze remonte le cou et casse la ligne épaules-taille recherchée en Physique.",
      "Garde le menton légèrement relevé et le regard fixe vers l'avant sur toute la présentation, pas seulement sur les poses statiques.",
    ],
  },
  "Men's Bodybuilding": {
    gender: "homme",
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
    tips: [
      "Verrouille toujours le côté fort vers le jury/l'appareil photo pour Side Chest et Side Triceps.",
      "Sur Most Muscular, expire fort en contractant, le relâchement du diaphragme aide à saturer le pump visuellement.",
      "Vérifie ta symétrie gauche/droite en photo de face avant d'envoyer : un déséquilibre se corrige à l'entraînement, pas sur scène.",
    ],
  },
  Bikini: {
    gender: "femme",
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
    tips: [
      "Le walk compte autant que la pose : hanches engagées, pas fluide, sourire dès l'entrée en scène.",
      "Cambre légèrement le bas du dos sur le quarter turn dos pour dessiner la ligne fessiers-jambes.",
      "Entraîne-toi en talons dès maintenant, l'équilibre et le placement du bassin changent complètement avec la hauteur du talon.",
    ],
  },
  Wellness: {
    gender: "femme",
    mandatory_poses: [
      "Quarter Turn Face",
      "Quarter Turn Côté Droit",
      "Quarter Turn Dos",
      "Quarter Turn Côté Gauche",
      "Back Pose (mise en valeur fessiers/jambes)",
    ],
    posing_routine: {
      duration: "30 secondes max",
      instructions:
        "Walk scénique valorisant le développement bas du corps (fessiers, jambes) tout en gardant une taille marquée et un haut du corps proportionné.",
    },
    notes:
      "Catégorie centrée sur le ratio haut du corps féminin / bas du corps développé. Ne pas confondre avec Bikini (plus léger) ni Figure (plus musclée en haut).",
    tips: [
      "La pose de dos est celle qui compte le plus ici, prends-en systématiquement une par semaine pour suivre le développement fessiers/ischios.",
      "Garde les épaules ouvertes et la taille gainée même de dos : le contraste taille/bassin est le critère clé de la catégorie.",
      "Varie les angles de 3/4 dos en plus du quarter turn classique pour mieux juger la rondeur du développement au fil des semaines.",
    ],
  },
  Figure: {
    gender: "femme",
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
    tips: [
      "Contracte les bras discrètement même sur les poses \"relâchées\", le tonus doit rester visible sans donner l'impression de forcer.",
      "Vérifie que le développement des épaules ne prend pas le pas sur le bas du corps en photo de face : c'est l'équilibre qui est jugé, pas la taille pure.",
    ],
  },
  "Fit Body": {
    gender: "femme",
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
    tips: [
      "Position intermédiaire entre Bikini et Figure : évite les poses trop statiques (Bikini) comme les contractions trop marquées (Figure).",
      "Le jury valorise le dynamisme, garde une posture engagée et un regard vif sur toute la présentation.",
    ],
  },
};

export const ALL_CATEGORIES = Object.keys(POSING_CATEGORIES);
export const CATEGORIES_BY_GENDER = {
  homme: ALL_CATEGORIES.filter((c) => POSING_CATEGORIES[c].gender === "homme"),
  femme: ALL_CATEGORIES.filter((c) => POSING_CATEGORIES[c].gender === "femme"),
};

export type SubmissionType = "mandatory_poses" | "posing_routine";

export const TYPE_LABELS: Record<SubmissionType, string> = {
  mandatory_poses: "Poses Obligatoires",
  posing_routine: "Routine Posing",
};
