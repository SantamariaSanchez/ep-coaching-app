export const MUSCLE_GROUPS = [
  "Pectoraux",
  "Dos",
  "Épaules",
  "Biceps",
  "Triceps",
  "Quadriceps",
  "Ischio-jambiers",
  "Fessiers",
  "Adducteurs",
  "Mollets",
  "Abdominaux",
  "Avant-bras",
  "Trapèzes",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

// Sous-groupes anatomiques (chefs musculaires) par groupe principal
export const MUSCLE_SUBGROUPS: Record<MuscleGroup, string[]> = {
  Pectoraux: ["Chef sternal", "Chef claviculaire", "Petit pectoral"],
  Dos: [
    "Grand dorsal",
    "Rhomboïdes",
    "Trapèze moyen",
    "Trapèze inférieur",
    "Érecteurs (lombaire)",
    "Érecteurs (thoracique)",
  ],
  Épaules: ["Faisceau antérieur", "Faisceau latéral", "Faisceau postérieur"],
  Biceps: ["Chef long", "Chef court", "Brachial"],
  Triceps: ["Chef long", "Chef latéral", "Chef médial"],
  Quadriceps: ["Rectus femoris", "Vaste latéral", "Vaste médial", "Vaste intermédiaire"],
  "Ischio-jambiers": ["Biceps fémoral", "Semi-tendineux", "Semi-membraneux"],
  Fessiers: ["Grand fessier", "Moyen fessier", "Petit fessier"],
  Adducteurs: ["Long adducteur", "Grand adducteur", "Gracile"],
  Mollets: ["Gastrocnémien", "Soléaire"],
  Abdominaux: ["Droit abdominal", "Obliques", "Transverse"],
  "Avant-bras": ["Fléchisseurs", "Extenseurs"],
  Trapèzes: ["Trapèze supérieur", "Trapèze moyen", "Trapèze inférieur"],
};

export interface VolumeLandmark {
  mev: number;
  mav: number;
  mrv: number;
}

export const VOLUME_LANDMARKS: Record<string, VolumeLandmark> = {
  Pectoraux:         { mev: 8,  mav: 16, mrv: 22 },
  Dos:               { mev: 10, mav: 18, mrv: 25 },
  Épaules:           { mev: 6,  mav: 14, mrv: 20 },
  Biceps:            { mev: 6,  mav: 14, mrv: 20 },
  Triceps:           { mev: 6,  mav: 14, mrv: 20 },
  Quadriceps:        { mev: 8,  mav: 16, mrv: 22 },
  "Ischio-jambiers": { mev: 6,  mav: 12, mrv: 16 },
  Fessiers:          { mev: 4,  mav: 12, mrv: 16 },
  Adducteurs:        { mev: 4,  mav: 10, mrv: 14 },
  Mollets:           { mev: 8,  mav: 16, mrv: 20 },
  Abdominaux:        { mev: 4,  mav: 12, mrv: 16 },
  "Avant-bras":      { mev: 4,  mav: 10, mrv: 14 },
  Trapèzes:          { mev: 4,  mav: 12, mrv: 16 },
};
