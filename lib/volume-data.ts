export const MUSCLE_GROUPS = [
  "Pectoraux",
  "Dos",
  "Épaules",
  "Biceps",
  "Triceps",
  "Quadriceps",
  "Ischio-jambiers",
  "Fessiers",
  "Mollets",
  "Abdominaux",
  "Avant-bras",
  "Trapèzes",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

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
  Mollets:           { mev: 8,  mav: 16, mrv: 20 },
  Abdominaux:        { mev: 4,  mav: 12, mrv: 16 },
  "Avant-bras":      { mev: 4,  mav: 10, mrv: 14 },
  Trapèzes:          { mev: 4,  mav: 12, mrv: 16 },
};
