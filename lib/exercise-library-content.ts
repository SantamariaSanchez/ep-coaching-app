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

// Grandes marques de machines de musculation qu'on retrouve dans la plupart
// des salles — sélectionnable pour préciser le modèle de machine utilisé.
export const MACHINE_BRANDS = [
  "Hammer Strength",
  "Cybex",
  "Nautilus",
  "Life Fitness",
  "Technogym",
  "Matrix",
  "Panatta",
  "Gym80",
  "Prime Fitness",
  "Arsenal Strength",
  "BH Fitness",
  "Atlantis",
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

// Regroupement grossier du champ "equipment" (9 valeurs) en 4 grandes
// familles pour le filtre "type de matériel" demandé par le coach — plus
// simple à utiliser que la liste détaillée quand on cherche vite un
// remplaçant (ex. "un truc à la poulie pour le dos").
export const EQUIPMENT_TYPES = ["machine", "poulie", "poids_libre", "poids_du_corps", "autre"] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  machine: "Machine",
  poulie: "Poulie / Câble",
  poids_libre: "Poids libre",
  poids_du_corps: "Poids du corps",
  autre: "Autre",
};

const EQUIPMENT_TO_TYPE: Record<string, EquipmentType> = {
  "Machine": "machine",
  "Smith machine": "machine",
  "Poulie": "poulie",
  "Barre": "poids_libre",
  "Haltères": "poids_libre",
  "Kettlebell": "poids_libre",
  "Poids du corps": "poids_du_corps",
  "Élastique": "autre",
  "Autre": "autre",
};

export function getEquipmentType(equipment: string | null): EquipmentType {
  if (!equipment) return "autre";
  return EQUIPMENT_TO_TYPE[equipment] ?? "autre";
}

// Echelle qualitative utilisée pour plusieurs attributs de classification
// (liberté de mouvement, facilité à répliquer, difficulté d'apprentissage,
// stabilité, accessibilité) — texte libre en base, mais un select à 3 crans
// suffit pour la saisie coach.
export const QUALITATIVE_SCALE = ["+", "++", "+++"] as const;

export const POSITION_OPTIONS = ["Raccourcie", "Étirée", "Complète", "Neutre"] as const;

// Décision du coach pour un exercice DANS une séance précise (table
// exercises, colonne tension_focus) — distincte de la classification
// générale de l'exercice (position, ci-dessus, table exercise_library).
// Valeurs alignées sur la contrainte SQL de la migration
// 20260807_exercise_assignment_design_decisions.
export const TENSION_FOCUS_OPTIONS = ["etire", "mi_course", "raccourci", "complet"] as const;
export type TensionFocusOption = (typeof TENSION_FOCUS_OPTIONS)[number];
export const TENSION_FOCUS_LABELS: Record<TensionFocusOption, string> = {
  etire: "Étirée",
  mi_course: "Mi-course",
  raccourci: "Raccourcie",
  complet: "Amplitude complète",
};
