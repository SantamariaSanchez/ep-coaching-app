import type { Food } from "@/utils/nutrition";
import type { ClientIntake } from "@/utils/client-intake";
import { buildFoodWatchContext, checkFoodWatch } from "@/lib/food-watch-keywords";

// Trouve un aliment alternatif de la même catégorie — pour faire tourner
// les choix d'une semaine à l'autre (rotation) ou remplacer un aliment qui
// ne convient plus plutôt que de reconstruire le repas depuis zéro. Une
// seule suggestion à la fois, jamais un remplacement silencieux : le coach
// voit le candidat et décide de l'accepter ou non (même principe que
// findSwapCandidate côté exercices, lib/plan-generator.ts).
export function findFoodSwapCandidate(
  current: Pick<Food, "id" | "category">,
  foods: Food[],
  intake: ClientIntake | null | undefined,
  excludeIds: string[]
): Food | null {
  if (!current.category) return null;
  const watchCtx = buildFoodWatchContext(intake);
  const candidates = foods.filter(
    (f) =>
      f.id !== current.id &&
      f.category === current.category &&
      !excludeIds.includes(f.id) &&
      checkFoodWatch(f, watchCtx).length === 0
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
