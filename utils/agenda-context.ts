import { getActiveProgram } from "@/utils/programs";
import { getActiveDietPlan } from "@/utils/nutrition";
import { getClientIntake } from "@/utils/client-intake";
import { getAccessoriesByExerciseName, getExerciseLibrary } from "@/utils/exercise-library";
import { accessoriesForSession } from "@/lib/session-accessories";
import type { AgendaContext, AgendaMealItem } from "@/lib/agenda-links";

// Ce que l'agenda doit savoir du programme et de la diète actifs pour relier
// ses blocs (séance du jour, repas du créneau) et construire la semaine.
// Version allégée : uniquement ce qui s'affiche, pas les notes privées du coach.
export async function getAgendaContext(userId: string): Promise<AgendaContext> {
  const [program, diet, intake, accessoriesByName, library] = await Promise.all([
    getActiveProgram(userId).catch(() => null),
    getActiveDietPlan(userId).catch(() => null),
    getClientIntake(userId).catch(() => null),
    getAccessoriesByExerciseName().catch(() => ({}) as Record<string, string[]>),
    getExerciseLibrary().catch(() => []),
  ]);

  const equipmentByName = new Map(library.map((e) => [e.name, e.equipment]));

  const sessions = (program?.days ?? []).map((d) => ({
    id: d.id,
    label: d.day_label,
    weekday: d.weekday ?? null,
    notes: d.notes ?? null,
    muscleGroups: [...new Set(d.exercises.map((e) => e.muscle_group).filter((m): m is string => !!m))],
    exercises: d.exercises.map((e) => ({
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      rest: e.rest_seconds,
      notes: e.notes,
      equipment: equipmentByName.get(e.name) ?? null,
    })),
    accessories: accessoriesForSession(d.exercises.map((e) => e.name), accessoriesByName).map((a) => a.accessory),
  }));

  let dietCtx: AgendaContext["diet"] = null;
  if (diet) {
    const meals: Record<string, Record<string, AgendaMealItem[]>> = {};
    for (const m of diet.diet_plan_meals ?? []) {
      // Variantes (>= 2) : options interchangeables, pas mangées en plus.
      if (m.variant_group != null && m.variant_group >= 2) continue;
      const key = diet.structure === "weekly" ? m.day_of_week ?? "all" : "all";
      if (key === "high") continue;
      const grams = Number(m.quantity_g) || 0;
      const food = m.foods;
      ((meals[key] ??= {})[m.meal_slot] ??= []).push({
        name: food?.name ?? "Aliment",
        grams,
        kcal: food ? Math.round((food.calories_per_100 * grams) / 100) : 0,
        proteins: food ? Math.round((food.proteins_per_100 * grams) / 100) : 0,
      });
    }
    dietCtx = { name: diet.name, structure: diet.structure === "weekly" ? "weekly" : "daily", meals };
  }

  return {
    programId: program?.id ?? null,
    programName: program?.name ?? null,
    sessions,
    gymName: intake?.gym_name ?? (intake?.training_access === "domicile_equipe" || intake?.training_access === "domicile_minimal" ? "À la maison" : null),
    diet: dietCtx,
  };
}
