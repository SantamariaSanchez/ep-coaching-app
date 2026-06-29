import { MUSCLE_GROUPS, MUSCLE_SUBGROUPS, type MuscleGroup } from "@/lib/volume-data";

// Bibliothèque d'exercices: mêmes groupes musculaires que le suivi de volume,
// plus une catégorie générique pour le cardio / les mouvements full body.
export const LIBRARY_MUSCLE_GROUPS = [...MUSCLE_GROUPS, "Full Body / Cardio"] as const;
export type LibraryMuscleGroup = (typeof LIBRARY_MUSCLE_GROUPS)[number];

export function getSubgroupsFor(group: string): string[] {
  return MUSCLE_SUBGROUPS[group as MuscleGroup] ?? [];
}

export const EQUIPMENT_OPTIONS = [
  "Barre",
  "Haltères",
  "Machine",
  "Poulie",
  "Smith machine",
  "Poids du corps",
  "Kettlebell",
  "Élastique",
  "Autre",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  compose: "Polyarticulaire",
  isolation: "Isolation",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};
