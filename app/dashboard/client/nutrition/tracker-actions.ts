"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/auth-guards";
import { isWithinBilanBackfillWindow, BILAN_BACKFILL_DAYS } from "@/lib/dates";
import { awardPoints, POINTS } from "@/lib/gamification";
import { fillDayFromPlan, syncDailyNutrition, withFoods, LOG_SELECT } from "@/lib/nutrition-sync";
import type { VariantChoice } from "@/lib/nutrition-engine";
import type { Food, FoodLogWithFood } from "@/utils/nutrition";

// Actions du tracker nutrition (components/nutrition/NutritionTracker.tsx).
// Toutes écrivent sur le compte connecté (guard.userId), jamais sur un id
// reçu du navigateur, et acceptent n'importe quel jour des 30 derniers pour
// pouvoir rattraper une journée oubliée.

type Result<T> = { error?: string } & T;

const MAX_ITEMS = 60;
const MAX_GRAMS = 5000;

function done(userId: string, dates: string[]) {
  revalidatePath("/dashboard/client/nutrition");
  revalidatePath("/dashboard/coach/moi/nutrition");
  revalidatePath("/dashboard/client/aujourdhui");
  revalidatePath("/dashboard/client/bilan");
  revalidatePath("/dashboard/coach/moi/bilan");
  const admin = createAdminClient();
  return Promise.all([...new Set(dates)].map((d) => syncDailyNutrition(admin, userId, d)));
}

async function guardDate(date: string) {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error } as const;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isWithinBilanBackfillWindow(date)) {
    return { error: `Tu peux loguer aujourd'hui et les ${BILAN_BACKFILL_DAYS} derniers jours.` } as const;
  }
  return { userId: guard.userId } as const;
}

function rowFor(userId: string, food: Food, grams: number, slot: string, date: string, planMealId: string | null) {
  const r = grams / 100;
  return {
    client_id: userId,
    food_id: food.id,
    meal_slot: slot,
    quantity_g: grams,
    logged_at: date,
    calories: Math.round(food.calories_per_100 * r),
    proteins: Math.round(food.proteins_per_100 * r * 10) / 10,
    carbs: Math.round(food.carbs_per_100 * r * 10) / 10,
    fats: Math.round(food.fats_per_100 * r * 10) / 10,
    diet_plan_meal_id: planMealId,
  };
}

/** Remplit la journée avec le plan (mode fixe, "diète suivie", repas manquants). */
export async function fillDayFromPlanAction(
  date: string,
  opts: { onlyIfEmpty: boolean; choice?: VariantChoice; slots?: string[] }
): Promise<Result<{ inserted: FoodLogWithFood[] }>> {
  const g = await guardDate(date);
  if ("error" in g) return { error: g.error, inserted: [] };
  try {
    const admin = createAdminClient();
    const res = await fillDayFromPlan(admin, g.userId, date, opts);
    if (res.inserted.length > 0) {
      awardPoints(g.userId, POINTS.nutrition_log_day, "Nutrition loguée", "nutrition_log_day", date);
      await done(g.userId, [date]);
    }
    return { inserted: res.inserted };
  } catch (e) {
    console.error("fillDayFromPlanAction error:", e);
    return { error: "Erreur inattendue.", inserted: [] };
  }
}

/** Ajoute des aliments à un repas (recherche, repas du plan, repas enregistré). */
export async function addTrackerItems(
  items: { foodId: string; quantityG: number; planMealId?: string | null }[],
  slot: string,
  date: string
): Promise<Result<{ logs: FoodLogWithFood[] }>> {
  const g = await guardDate(date);
  if ("error" in g) return { error: g.error, logs: [] };
  const clean = items.filter((i) => i.foodId && i.quantityG > 0 && i.quantityG <= MAX_GRAMS).slice(0, MAX_ITEMS);
  if (clean.length === 0) return { error: "Rien à ajouter.", logs: [] };
  try {
    const admin = createAdminClient();
    const { data: foods } = await admin.from("foods").select("*").in("id", [...new Set(clean.map((i) => i.foodId))]);
    const byId = new Map(((foods ?? []) as Food[]).map((f) => [f.id, f]));
    const rows = clean
      .filter((i) => byId.has(i.foodId))
      .map((i) => rowFor(g.userId, byId.get(i.foodId)!, i.quantityG, slot, date, i.planMealId ?? null));
    if (rows.length === 0) return { error: "Aliment introuvable.", logs: [] };
    const { data, error } = await admin.from("food_logs").insert(rows).select(LOG_SELECT);
    if (error) {
      console.error("addTrackerItems error:", error);
      return { error: "Erreur lors de l'ajout.", logs: [] };
    }
    awardPoints(g.userId, POINTS.nutrition_log_day, "Nutrition loguée", "nutrition_log_day", date);
    await done(g.userId, [date]);
    return { logs: await withFoods(admin, data) };
  } catch (e) {
    console.error("addTrackerItems error:", e);
    return { error: "Erreur inattendue.", logs: [] };
  }
}

/**
 * Change la quantité et/ou l'aliment de lignes déjà loguées (remplacement
 * par un aliment similaire, ré-équilibrage automatique de la journée).
 */
export async function updateTrackerLogs(
  changes: { id: string; foodId?: string | null; quantityG: number }[]
): Promise<Result<{ logs: FoodLogWithFood[] }>> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error, logs: [] };
  const clean = changes.filter((c) => c.id && c.quantityG > 0 && c.quantityG <= MAX_GRAMS).slice(0, MAX_ITEMS);
  if (clean.length === 0) return { logs: [] };
  try {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("food_logs")
      .select("id, food_id, quantity_g, logged_at, calories, proteins, carbs, fats")
      .eq("client_id", guard.userId)
      .in("id", clean.map((c) => c.id));
    const rows = (existing ?? []) as { id: string; food_id: string | null; quantity_g: number; logged_at: string; calories: number | null; proteins: number | null; carbs: number | null; fats: number | null }[];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const foodIds = [...new Set(clean.map((c) => c.foodId ?? byId.get(c.id)?.food_id).filter((x): x is string => !!x))];
    const { data: foods } = foodIds.length ? await admin.from("foods").select("*").in("id", foodIds) : { data: [] };
    const foodById = new Map(((foods ?? []) as Food[]).map((f) => [f.id, f]));

    const dates: string[] = [];
    for (const c of clean) {
      const row = byId.get(c.id);
      if (!row || !isWithinBilanBackfillWindow(row.logged_at)) continue;
      const foodId = c.foodId ?? row.food_id;
      const food = foodId ? foodById.get(foodId) : undefined;
      let patch: Record<string, unknown>;
      if (food) {
        const r = c.quantityG / 100;
        patch = {
          food_id: food.id,
          quantity_g: c.quantityG,
          calories: Math.round(food.calories_per_100 * r),
          proteins: Math.round(food.proteins_per_100 * r * 10) / 10,
          carbs: Math.round(food.carbs_per_100 * r * 10) / 10,
          fats: Math.round(food.fats_per_100 * r * 10) / 10,
        };
      } else {
        // Ancienne ligne sans aliment (recette, ajout rapide) : proportionnel.
        const k = row.quantity_g > 0 ? c.quantityG / row.quantity_g : 1;
        patch = {
          quantity_g: c.quantityG,
          calories: Math.round((row.calories ?? 0) * k),
          proteins: Math.round((row.proteins ?? 0) * k * 10) / 10,
          carbs: Math.round((row.carbs ?? 0) * k * 10) / 10,
          fats: Math.round((row.fats ?? 0) * k * 10) / 10,
        };
      }
      const { error } = await admin.from("food_logs").update(patch).eq("id", c.id).eq("client_id", guard.userId);
      if (error) {
        console.error("updateTrackerLogs error:", error);
        return { error: "Erreur lors de la mise à jour.", logs: [] };
      }
      dates.push(row.logged_at);
    }
    const { data: updated } = await admin.from("food_logs").select(LOG_SELECT).eq("client_id", guard.userId).in("id", clean.map((c) => c.id));
    await done(guard.userId, dates);
    return { logs: await withFoods(admin, updated) };
  } catch (e) {
    console.error("updateTrackerLogs error:", e);
    return { error: "Erreur inattendue.", logs: [] };
  }
}

export async function deleteTrackerLogs(ids: string[]): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (ids.length === 0) return {};
  try {
    const admin = createAdminClient();
    const { data: rows } = await admin.from("food_logs").select("logged_at").eq("client_id", guard.userId).in("id", ids.slice(0, MAX_ITEMS));
    const { error } = await admin.from("food_logs").delete().eq("client_id", guard.userId).in("id", ids.slice(0, MAX_ITEMS));
    if (error) {
      console.error("deleteTrackerLogs error:", error);
      return { error: "Erreur lors de la suppression." };
    }
    await done(guard.userId, ((rows ?? []) as { logged_at: string }[]).map((r) => r.logged_at));
    return {};
  } catch (e) {
    console.error("deleteTrackerLogs error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Une recette ou un ajout rapide devient un aliment perso "par portion"
// (réutilisé s'il existe déjà), pour que la ligne garde son nom et reste
// modifiable comme n'importe quel aliment.
async function portionFood(admin: ReturnType<typeof createAdminClient>, userId: string, name: string, category: string, m: { kcal: number; p: number; c: number; f: number }): Promise<{ food?: Food; portionG: number; error?: string }> {
  // Une portion fait au moins 100 g, plus si les valeurs dépassent les
  // bornes de la table foods (1000 kcal et 100 g de macro pour 100 g).
  const portionG = Math.ceil(Math.max(100, (m.kcal * 100) / 1000, m.p, m.c, m.f));
  const k = 100 / portionG;
  const per100 = {
    calories_per_100: Math.min(1000, Math.round(m.kcal * k * 10) / 10),
    proteins_per_100: Math.min(100, Math.round(m.p * k * 10) / 10),
    carbs_per_100: Math.min(100, Math.round(m.c * k * 10) / 10),
    fats_per_100: Math.min(100, Math.round(m.f * k * 10) / 10),
  };
  const { data: existing } = await admin
    .from("foods")
    .select("*")
    .eq("created_by", userId)
    .eq("name", name)
    .eq("calories_per_100", per100.calories_per_100)
    .limit(1)
    .maybeSingle();
  if (existing) return { food: existing as Food, portionG };
  const { data, error } = await admin
    .from("foods")
    .insert({ name, category, ...per100, fibers_per_100: 0, is_custom: true, created_by: userId })
    .select()
    .single();
  if (error || !data) {
    console.error("portionFood error:", error);
    return { error: "Impossible d'enregistrer cet aliment.", portionG };
  }
  updateTag("foods");
  return { food: data as Food, portionG };
}

export async function logPortion(
  input: { name: string; kind: "recette" | "rapide"; kcal: number; protein: number; carbs: number; fat: number; servings: number },
  slot: string,
  date: string
): Promise<Result<{ logs: FoodLogWithFood[]; food?: Food }>> {
  const g = await guardDate(date);
  if ("error" in g) return { error: g.error, logs: [] };
  const name = input.name.trim().slice(0, 200);
  const servings = Math.min(10, Math.max(0.25, input.servings || 1));
  if (!name) return { error: "Donne un nom.", logs: [] };
  if (!(input.kcal > 0) || input.kcal > 5000) return { error: "Calories invalides.", logs: [] };
  try {
    const admin = createAdminClient();
    const pf = await portionFood(admin, g.userId, name, input.kind === "recette" ? "Recette" : "Divers", {
      kcal: input.kcal,
      p: Math.max(0, input.protein || 0),
      c: Math.max(0, input.carbs || 0),
      f: Math.max(0, input.fat || 0),
    });
    if (!pf.food) return { error: pf.error ?? "Erreur.", logs: [] };
    const grams = Math.round(pf.portionG * servings);
    const { data, error } = await admin.from("food_logs").insert(rowFor(g.userId, pf.food, grams, slot, date, null)).select(LOG_SELECT);
    if (error) return { error: "Erreur lors de l'ajout.", logs: [] };
    awardPoints(g.userId, POINTS.nutrition_log_day, "Nutrition loguée", "nutrition_log_day", date);
    await done(g.userId, [date]);
    return { logs: await withFoods(admin, data), food: pf.food };
  } catch (e) {
    console.error("logPortion error:", e);
    return { error: "Erreur inattendue.", logs: [] };
  }
}

/** Journal d'un jour donné (navigation entre les jours dans le tracker). */
export async function getTrackerDay(date: string): Promise<Result<{ logs: FoodLogWithFood[] }>> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error, logs: [] };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Date invalide.", logs: [] };
  const admin = createAdminClient();
  const { data } = await admin.from("food_logs").select(LOG_SELECT).eq("client_id", guard.userId).eq("logged_at", date).order("created_at");
  return { logs: await withFoods(admin, data) };
}
