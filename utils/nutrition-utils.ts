// Pure client-safe utility functions — no server imports
import { MICRO_KEYS, type MicroKey } from "@/lib/micro-references";
import type { Food, FoodLogWithFood, MicroValues, NutrientCalculation, MicroStat } from "@/utils/nutrition";

export function calculateNutrients(
  food: Food,
  quantityG: number
): NutrientCalculation {
  const r = quantityG / 100;
  const round = (n: number) => Math.round((n ?? 0) * r * 10) / 10;

  const micros: Partial<MicroValues> = {};
  for (const key of MICRO_KEYS) {
    const val = food[key as keyof Food] as number | undefined;
    if (val != null && val > 0) {
      micros[key] = Math.round(val * r * 1000) / 1000;
    }
  }

  return {
    calories: round(food.calories_per_100),
    proteins: round(food.proteins_per_100),
    carbs: round(food.carbs_per_100),
    fats: round(food.fats_per_100),
    micros,
  };
}

// N'a besoin que de foods/quantity_g — élargi (au lieu de FoodLogWithFood
// complet) pour être réutilisable sur un plan en cours de construction
// (PlanMealRow, pas encore un vrai log) sans fabriquer de faux champs
// (id, logged_at...) juste pour satisfaire le type.
export function getMicroDeficiencyOrder(
  logs: Pick<FoodLogWithFood, "foods" | "quantity_g">[],
  refs: typeof import("@/lib/micro-references").MICRO_DAILY_REF
): MicroStat[] {
  const totals: Partial<MicroValues> = {};

  for (const log of logs) {
    if (!log.foods) continue;
    const calc = calculateNutrients(log.foods, log.quantity_g);
    for (const [k, v] of Object.entries(calc.micros)) {
      const key = k as MicroKey;
      totals[key] = (totals[key] ?? 0) + (v ?? 0);
    }
  }

  const stats: MicroStat[] = MICRO_KEYS.map((key) => {
    const ref = refs[key];
    const consumed = totals[key] ?? 0;
    const pct = ref.value > 0 ? (consumed / ref.value) * 100 : 0;
    const hasData = logs.some(
      (l) => l.foods && ((l.foods[key as keyof Food] as number) ?? 0) > 0
    );

    return {
      key,
      name: ref.name,
      consumed: Math.round(consumed * 10) / 10,
      target: ref.value,
      unit: ref.unit,
      pct: Math.round(pct),
      hasData,
    };
  });

  return stats.sort((a, b) => a.pct - b.pct);
}
