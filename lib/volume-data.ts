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

import { SMALL_MUSCLE_GROUPS, SMALL_MUSCLE_VOLUME_FACTOR, TRAINING_RULES, WEEKLY_SETS_FLOOR } from "@/lib/coaching-knowledge";

/**
 * Repères de volume en séries difficiles par semaine et par groupe.
 * Source unique : lib/coaching-knowledge.ts (Mastermind). `mev` et `mav`
 * bornent la plage de DÉPART (8 à 12), `mrv` le haut de la plage utile
 * (10 à 25) selon la récupération. Ce sont des repères de départ, jamais
 * une prescription : on ajoute des séries seulement si le client récupère
 * en avance. Les noms de champs sont conservés pour les consommateurs
 * existants (jauges, couleurs).
 */
export interface VolumeLandmark {
  /** Bas de la plage de départ. */
  mev: number;
  /** Haut de la plage de départ. */
  mav: number;
  /** Haut de la plage utile. */
  mrv: number;
}

function landmarkFor(group: string): VolumeLandmark {
  const { weeklyHardSetsStart, weeklyHardSetsRange } = TRAINING_RULES;
  if (SMALL_MUSCLE_GROUPS.includes(group)) {
    return {
      mev: WEEKLY_SETS_FLOOR,
      mav: Math.round(weeklyHardSetsStart.max * SMALL_MUSCLE_VOLUME_FACTOR),
      mrv: weeklyHardSetsRange.max,
    };
  }
  return { mev: weeklyHardSetsStart.min, mav: weeklyHardSetsStart.max, mrv: weeklyHardSetsRange.max };
}

export const VOLUME_LANDMARKS: Record<string, VolumeLandmark> = Object.fromEntries(
  MUSCLE_GROUPS.map((g) => [g, landmarkFor(g)])
);
