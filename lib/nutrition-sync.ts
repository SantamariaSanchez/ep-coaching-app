import { createAdminClient } from "@/lib/supabase-admin";
import { planItemsFor, type VariantChoice } from "@/lib/nutrition-engine";
import { attachFoods, type DietPlanWithMeals, type FoodLog, type FoodLogWithFood } from "@/utils/nutrition";

// Lien tracker nutrition <-> bilan quotidien (demande directe 2026-09-27) :
// les calories et macros du bilan ne se tapent plus à la main, elles
// viennent de ce qui est logué dans le tracker, pour n'importe quel jour.

type Admin = ReturnType<typeof createAdminClient>;

// Jamais l'embed foods(*) sur food_logs : voir attachFoods (utils/nutrition.ts).
export const LOG_SELECT = "*";

export function withFoods(admin: Admin, rows: unknown[] | null): Promise<FoodLogWithFood[]> {
  return attachFoods(admin, rows as FoodLog[] | null);
}

export async function getActivePlan(admin: Admin, userId: string): Promise<DietPlanWithMeals | null> {
  const { data } = await admin
    .from("diet_plans")
    .select("*, diet_plan_meals(*, foods(*))")
    .eq("client_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as DietPlanWithMeals | null) ?? null;
}

export async function dayTotals(admin: Admin, userId: string, date: string) {
  const { data } = await admin.from("food_logs").select("calories, proteins, carbs, fats").eq("client_id", userId).eq("logged_at", date);
  const rows = (data ?? []) as { calories: number | null; proteins: number | null; carbs: number | null; fats: number | null }[];
  return {
    count: rows.length,
    calories: Math.round(rows.reduce((s, r) => s + (r.calories ?? 0), 0)),
    proteins: Math.round(rows.reduce((s, r) => s + (r.proteins ?? 0), 0)),
    carbs: Math.round(rows.reduce((s, r) => s + (r.carbs ?? 0), 0)),
    fats: Math.round(rows.reduce((s, r) => s + (r.fats ?? 0), 0)),
  };
}

/**
 * Recopie les totaux du tracker dans le bilan du jour s'il existe déjà. On
 * ne crée jamais de bilan ici : une ligne daily_logs vide compterait comme
 * un bilan commencé ailleurs dans l'appli.
 */
export async function syncDailyNutrition(admin: Admin, userId: string, date: string): Promise<void> {
  try {
    const t = await dayTotals(admin, userId, date);
    await admin
      .from("daily_logs")
      .update({
        calories_kcal: t.count ? t.calories : null,
        proteins_g: t.count ? t.proteins : null,
        carbs_g: t.count ? t.carbs : null,
        fats_g: t.count ? t.fats : null,
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", userId)
      .eq("log_date", date);
  } catch (e) {
    console.error("syncDailyNutrition error:", e);
  }
}

/**
 * Remplit une journée avec le plan actif : chaque repas du plan qui n'a
 * encore rien de logué ce jour-là est ajouté tel quel. `onlyIfEmpty` : ne
 * rien faire si la journée a déjà la moindre ligne (le cas du remplissage
 * automatique à l'ouverture, pour ne jamais remettre un repas retiré exprès).
 */
export async function fillDayFromPlan(
  admin: Admin,
  userId: string,
  date: string,
  opts: { onlyIfEmpty: boolean; choice?: VariantChoice; slots?: string[] }
): Promise<{ inserted: FoodLogWithFood[]; skipped?: "no_plan" | "not_empty" }> {
  const plan = await getActivePlan(admin, userId);
  if (!plan) return { inserted: [], skipped: "no_plan" };

  const { data: existing } = await admin.from("food_logs").select("meal_slot").eq("client_id", userId).eq("logged_at", date);
  const filledSlots = new Set(((existing ?? []) as { meal_slot: string | null }[]).map((r) => r.meal_slot));
  if (opts.onlyIfEmpty && filledSlots.size > 0) return { inserted: [], skipped: "not_empty" };

  const items = planItemsFor(plan, date, opts.choice ?? {}).filter(
    (i) => !filledSlots.has(i.slot) && (!opts.slots || opts.slots.includes(i.slot))
  );
  if (items.length === 0) return { inserted: [] };

  const rows = items.map((i) => {
    const r = i.grams / 100;
    return {
      client_id: userId,
      food_id: i.food.id,
      meal_slot: i.slot,
      quantity_g: i.grams,
      logged_at: date,
      calories: Math.round(i.food.calories_per_100 * r),
      proteins: Math.round(i.food.proteins_per_100 * r * 10) / 10,
      carbs: Math.round(i.food.carbs_per_100 * r * 10) / 10,
      fats: Math.round(i.food.fats_per_100 * r * 10) / 10,
      diet_plan_meal_id: i.planMealId,
    };
  });
  const { data, error } = await admin.from("food_logs").insert(rows).select(LOG_SELECT);
  if (error) {
    console.error("fillDayFromPlan error:", error);
    return { inserted: [] };
  }
  await syncDailyNutrition(admin, userId, date);
  return { inserted: await withFoods(admin, data) };
}
