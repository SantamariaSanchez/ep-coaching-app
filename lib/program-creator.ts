// Créateur de programme guidé — pas d'IA, un questionnaire qui construit
// un vrai programme à partir de la bibliothèque d'exercices officielle
// (lib/exercise-library-seed.ts) et de gabarits de split éprouvés.
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/volume-data";
import { EXERCISE_LIBRARY_SEED, type SeedExercise } from "@/lib/exercise-library-seed";
import type { ProgramInput, DayInput, ExerciseInput } from "@/utils/programs";

export type Goal = "hypertrophie" | "force" | "perte_de_poids" | "forme_generale";
export type Level = "debutant" | "intermediaire" | "avance";
export type EquipmentPref = "salle_complete" | "haltieres_seulement" | "poids_du_corps";
export type SessionLength = "courte" | "moyenne" | "longue";
export type DaysPerWeek = 2 | 3 | 4 | 5 | 6;

export const GOAL_LABELS: Record<Goal, string> = {
  hypertrophie: "Prise de muscle",
  force: "Prise de force",
  perte_de_poids: "Perte de poids",
  forme_generale: "Forme générale",
};

export const LEVEL_LABELS: Record<Level, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

export const EQUIPMENT_PREF_LABELS: Record<EquipmentPref, string> = {
  salle_complete: "Salle complète",
  haltieres_seulement: "Haltères seulement",
  poids_du_corps: "Poids du corps uniquement",
};

export const SESSION_LENGTH_LABELS: Record<SessionLength, string> = {
  courte: "Courte (< 45 min)",
  moyenne: "Moyenne (45-60 min)",
  longue: "Longue (60 min +)",
};

export const DAYS_OPTIONS: DaysPerWeek[] = [2, 3, 4, 5, 6];

export interface ProgramCreatorAnswers {
  goal: Goal;
  level: Level;
  daysPerWeek: DaysPerWeek;
  equipment: EquipmentPref;
  sessionLength: SessionLength;
  priorityGroups: MuscleGroup[];
}

const GOAL_PARAMS: Record<Goal, { sets: number; reps: string; rest: number; rir: number }> = {
  hypertrophie:   { sets: 3, reps: "8-12",  rest: 90,  rir: 2 },
  force:          { sets: 4, reps: "4-6",   rest: 150, rir: 1 },
  perte_de_poids: { sets: 3, reps: "12-15", rest: 60,  rir: 2 },
  forme_generale: { sets: 3, reps: "10-12", rest: 75,  rir: 2 },
};

const LEVEL_RANK: Record<Level, number> = { debutant: 0, intermediaire: 1, avance: 2 };

interface SplitDay {
  label: string;
  groups: MuscleGroup[];
}

const SPLITS: Record<DaysPerWeek, SplitDay[]> = {
  2: [
    { label: "Full Body A", groups: ["Quadriceps", "Pectoraux", "Dos", "Épaules", "Abdominaux"] },
    { label: "Full Body B", groups: ["Ischio-jambiers", "Fessiers", "Dos", "Pectoraux", "Biceps", "Triceps"] },
  ],
  3: [
    { label: "Full Body A", groups: ["Quadriceps", "Pectoraux", "Dos", "Épaules", "Abdominaux"] },
    { label: "Full Body B", groups: ["Ischio-jambiers", "Fessiers", "Dos", "Pectoraux", "Biceps"] },
    { label: "Full Body C", groups: ["Quadriceps", "Épaules", "Dos", "Triceps", "Mollets"] },
  ],
  4: [
    { label: "Haut du corps A", groups: ["Pectoraux", "Dos", "Épaules", "Biceps", "Triceps"] },
    { label: "Bas du corps A", groups: ["Quadriceps", "Ischio-jambiers", "Fessiers", "Mollets", "Abdominaux"] },
    { label: "Haut du corps B", groups: ["Dos", "Pectoraux", "Épaules", "Triceps", "Biceps"] },
    { label: "Bas du corps B", groups: ["Fessiers", "Ischio-jambiers", "Quadriceps", "Mollets", "Abdominaux"] },
  ],
  5: [
    { label: "Pectoraux & Triceps", groups: ["Pectoraux", "Triceps"] },
    { label: "Dos & Biceps", groups: ["Dos", "Biceps", "Trapèzes"] },
    { label: "Jambes", groups: ["Quadriceps", "Ischio-jambiers", "Fessiers", "Mollets"] },
    { label: "Épaules & Abdos", groups: ["Épaules", "Abdominaux", "Trapèzes"] },
    { label: "Bras & Avant-bras", groups: ["Biceps", "Triceps", "Avant-bras"] },
  ],
  6: [
    { label: "Push A", groups: ["Pectoraux", "Épaules", "Triceps"] },
    { label: "Pull A", groups: ["Dos", "Biceps", "Trapèzes"] },
    { label: "Legs A", groups: ["Quadriceps", "Ischio-jambiers", "Fessiers"] },
    { label: "Push B", groups: ["Pectoraux", "Épaules", "Triceps"] },
    { label: "Pull B", groups: ["Dos", "Biceps", "Avant-bras"] },
    { label: "Legs B", groups: ["Quadriceps", "Fessiers", "Mollets", "Abdominaux"] },
  ],
};

function equipmentMatches(equipment: string | null, pref: EquipmentPref): boolean {
  if (pref === "salle_complete") return true;
  if (pref === "poids_du_corps") return equipment === "Poids du corps" || !equipment;
  // haltieres_seulement
  return equipment === "Haltères" || equipment === "Poids du corps" || !equipment;
}

function exercisesPerGroup(sessionLength: SessionLength, isPriority: boolean): number {
  const base = sessionLength === "courte" ? 1 : sessionLength === "moyenne" ? 2 : 3;
  return isPriority ? base + 1 : base;
}

function pickExercisesForGroup(
  group: MuscleGroup,
  count: number,
  level: Level,
  equipment: EquipmentPref,
  used: Set<string>
): SeedExercise[] {
  const pool = EXERCISE_LIBRARY_SEED.filter(
    (e) =>
      e.muscle_group === group &&
      LEVEL_RANK[(e.difficulty ?? "debutant") as Level] <= LEVEL_RANK[level] &&
      equipmentMatches(e.equipment, equipment)
  );
  // Polyarticulaires d'abord (meilleur retour sur investissement), puis isolation.
  const sorted = [...pool].sort((a, b) => {
    if (a.category === b.category) return 0;
    return a.category === "compose" ? -1 : 1;
  });

  const picked: SeedExercise[] = [];
  for (const ex of sorted) {
    if (picked.length >= count) break;
    if (used.has(ex.name)) continue;
    picked.push(ex);
    used.add(ex.name);
  }
  // Pool épuisé (matériel/niveau trop restrictifs) — autorise les répétitions
  // plutôt que de laisser un groupe musculaire vide.
  if (picked.length < count) {
    for (const ex of sorted) {
      if (picked.length >= count) break;
      if (picked.includes(ex)) continue;
      picked.push(ex);
    }
  }
  return picked;
}

export function generateProgram(answers: ProgramCreatorAnswers): ProgramInput {
  const split = SPLITS[answers.daysPerWeek];
  const params = GOAL_PARAMS[answers.goal];
  const used = new Set<string>();

  const days: DayInput[] = split.map((day) => {
    const exercises: ExerciseInput[] = [];
    for (const group of day.groups) {
      const isPriority = answers.priorityGroups.includes(group);
      const count = exercisesPerGroup(answers.sessionLength, isPriority);
      const picked = pickExercisesForGroup(group, count, answers.level, answers.equipment, used);
      for (const ex of picked) {
        exercises.push({
          name: ex.name,
          sets: params.sets,
          reps: params.reps,
          rir: params.rir,
          rest_seconds: params.rest,
          notes: null,
          muscle_group: ex.muscle_group,
          muscle_subgroup: ex.muscle_subgroup,
          is_direct: true,
        });
      }
    }
    return { day_label: day.label, exercises };
  });

  return {
    name: `Programme ${GOAL_LABELS[answers.goal]} · ${answers.daysPerWeek}j/semaine`,
    type: GOAL_LABELS[answers.goal],
    frequency: answers.daysPerWeek,
    days,
  };
}

export { MUSCLE_GROUPS };
export type { MuscleGroup };
