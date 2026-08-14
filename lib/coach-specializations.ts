// Types/constantes pures (aucun import serveur) — même séparation que
// lib/resource-categories.ts : consommé à la fois par une page serveur
// (/coachs) et un composant client (édition du profil coach), donc pas de
// createServerSupabase ici.
//
// Axe 5 de VISION.md : un membre qui cherche un coach doit pouvoir trouver
// celui qui correspond à SON profil (objectif, contrainte, expertise
// requise), y compris être orienté vers un spécialiste si le premier coach
// contacté n'est pas le bon interlocuteur (ex. blessure, TCA).

export const COACH_SPECIALIZATIONS = [
  "Généraliste",
  "Prise de masse",
  "Perte de gras",
  "Force & powerlifting",
  "Bodybuilding compétition",
  "Blessures & rééducation",
  "Troubles du comportement alimentaire",
  "Coaching féminin",
  "Grossesse & post-partum",
  "Débutants",
  "Adolescents & jeunes athlètes",
  "Seniors (50+)",
  "Nutrition seule (sans suivi entraînement)",
] as const;

export type CoachSpecialization = (typeof COACH_SPECIALIZATIONS)[number];

export function isCoachSpecialization(value: string): value is CoachSpecialization {
  return (COACH_SPECIALIZATIONS as readonly string[]).includes(value);
}
