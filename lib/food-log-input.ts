// Bornes d'un aliment noté (addFoodLog) : les valeurs viennent du navigateur.
// Une quantité négative, NaN ou 99 999 kcal faussait le compteur du jour, la
// notification au coach et les points. Bornes larges : aucun vrai repas exclu.

export interface FoodLogNumbers {
  quantityG: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  loggedAt: string;
}

export function foodLogInputError(p: FoodLogNumbers): string | null {
  const ok = (v: unknown, max: number) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
  if (!ok(p.quantityG, 5000) || p.quantityG === 0) return "Quantité invalide.";
  if (!ok(p.calories, 10000) || !ok(p.proteins, 1000) || !ok(p.carbs, 1500) || !ok(p.fats, 1000)) return "Valeurs nutritionnelles invalides.";
  if (typeof p.loggedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.loggedAt)) return "Date invalide.";
  return null;
}
