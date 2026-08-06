"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getProfile, isSubscribed } from "@/utils/auth";
import { requireClient } from "@/lib/auth-guards";
import { awardPoints, POINTS } from "@/lib/gamification";
import { revalidatePath } from "next/cache";
import type { Food, NutritionProfileInput, DietMode, DietStructure } from "@/utils/nutrition";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";

// Self-serve nutrition targets — only available to free-tier community
// members. They set and adjust their own targets, no coach review.
export async function saveOwnNutritionProfile(
  clientId: string,
  data: NutritionProfileInput
): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };
  if (guard.userId !== clientId) return { error: "Accès refusé." };

  const supabase = await createServerSupabase();

  const fields = {
    calories_target: data.calories_target,
    proteins_target: data.proteins_target,
    carbs_target: data.carbs_target,
    fats_target: data.fats_target,
    calories_offset_rest: data.calories_offset_rest ?? null,
    calories_offset_high: data.calories_offset_high ?? null,
    tdee: data.tdee,
    bmr: data.bmr,
    phase: data.phase,
    gender: data.gender,
    height: data.height,
    age: data.age,
    training_type: data.training_type,
    sessions_per_week: data.sessions_per_week,
    session_duration: data.session_duration,
    steps_per_day: data.steps_per_day,
    activity_level: data.activity_level,
    updated_at: new Date().toISOString(),
  };

  // Explicit select-then-update-or-insert instead of upsert(onConflict): see
  // the coach-side saveNutritionProfile action for why.
  const { data: existingRows } = await supabase
    .from("nutrition_profiles")
    .select("id")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

  let error;
  if (existingRows && existingRows.length > 0) {
    ({ error } = await supabase
      .from("nutrition_profiles")
      .update(fields)
      .eq("id", existingRows[0].id));
    if (existingRows.length > 1) {
      await supabase
        .from("nutrition_profiles")
        .delete()
        .in("id", existingRows.slice(1).map((r) => r.id));
    }
  } else {
    ({ error } = await supabase
      .from("nutrition_profiles")
      .insert({ client_id: clientId, ...fields }));
  }

  if (error) {
    console.error("saveOwnNutritionProfile error:", error);
    return { error: "Erreur lors de la sauvegarde." };
  }

  revalidatePath(`/dashboard/client/nutrition`);
  return {};
}

export async function addFoodLog(params: {
  foodId: string | null;
  mealSlot: string;
  quantityG: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  loggedAt: string;
}): Promise<{ id?: string; error?: string }> {
  try {
    const guard = await requireClient();
    if (!guard.ok) return { error: guard.error };

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("food_logs")
      .insert({
        client_id: guard.userId,
        food_id: params.foodId,
        meal_slot: params.mealSlot,
        quantity_g: params.quantityG,
        logged_at: params.loggedAt,
        calories: params.calories,
        proteins: params.proteins,
        carbs: params.carbs,
        fats: params.fats,
      })
      .select("id")
      .single();

    if (error) {
      console.error("food_log insert error:", error);
      return { error: error.message ?? "Erreur lors de l'ajout." };
    }
    if (!data) return { error: "Erreur lors de l'ajout (pas de data)." };

    awardPoints(guard.userId, POINTS.nutrition_log_day, "Nutrition loguée", "nutrition_log_day", params.loggedAt);

    return { id: data.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function removeFoodLog(
  logId: string
): Promise<{ error?: string }> {
  try {
    const guard = await requireClient();
    if (!guard.ok) return { error: guard.error };

    const supabase = await createServerSupabase();
    await supabase
      .from("food_logs")
      .delete()
      .eq("id", logId)
      .eq("client_id", guard.userId);

    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function createCustomFood(params: {
  name: string;
  category: string;
  calories_per_100: number;
  proteins_per_100: number;
  carbs_per_100: number;
  fats_per_100: number;
  fibers_per_100: number;
}): Promise<{ food?: Food; error?: string }> {
  try {
    const guard = await requireClient();
    if (!guard.ok) return { error: guard.error };

    // Revalidation serveur du nom : la validation côté client ne protège que
    // le parcours normal dans l'interface.
    const name = (params.name ?? "").trim();
    if (!name) return { error: "Le nom de l'aliment est obligatoire." };
    if (name.length > 200) {
      return { error: "Le nom de l'aliment est trop long (200 caractères maximum)." };
    }

    // Admin client — bypasses RLS regardless of how the foods table was set
    // up, since this is shared reference content.
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("foods")
      .insert({
        ...params,
        name,
        is_custom: true,
        created_by: guard.userId,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("createCustomFood error:", error);
      // 23514 = violation d'une contrainte CHECK : les valeurs saisies sortent
      // des bornes de la table foods. Message explicite plutôt qu'une erreur
      // générique qui laisse la personne sans piste.
      if (error?.code === "23514") {
        return {
          error:
            "Valeurs hors bornes : pour 100 g, les calories doivent rester sous 1000 kcal et chaque macro sous 100 g.",
        };
      }
      return { error: "Erreur lors de la création." };
    }
    return { food: data as Food };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// Self-serve diet plans — free-tier community members build and manage
// their own plans, no coach involved. Paying clients' plans stay coach-only.
async function guardFreeMember(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { ok: false, error: guard.error };
  const profile = await getProfile(guard.userId);
  if (isSubscribed(profile)) {
    return { ok: false, error: "Ton plan est géré par ton coach." };
  }
  return { ok: true, userId: guard.userId };
}

export async function createOwnDietPlan(
  name: string,
  mode: DietMode,
  meals: DietPlanMealInput[],
  structure: DietStructure = "daily"
): Promise<{ error?: string; id?: string }> {
  const guard = await guardFreeMember();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();

    await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("client_id", guard.userId)
      .eq("is_active", true);

    const { data: plan, error: planError } = await supabase
      .from("diet_plans")
      .insert({
        client_id: guard.userId,
        name,
        mode,
        structure,
        is_active: true,
        created_by: guard.userId,
      })
      .select("id")
      .single();

    if (planError || !plan) return { error: "Erreur lors de la création du plan." };

    if (meals.length > 0) {
      const { error: mealsError } = await supabase
        .from("diet_plan_meals")
        .insert(meals.map((m) => ({ ...m, plan_id: plan.id })));
      if (mealsError) return { error: "Erreur lors de l'ajout des repas." };
    }

    revalidatePath("/dashboard/client/nutrition");
    return { id: plan.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function activateOwnDietPlan(planId: string): Promise<{ error?: string }> {
  const guard = await guardFreeMember();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("client_id", guard.userId)
      .eq("is_active", true);
    await supabase
      .from("diet_plans")
      .update({ is_active: true })
      .eq("id", planId)
      .eq("client_id", guard.userId);

    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deactivateOwnDietPlan(planId: string): Promise<{ error?: string }> {
  const guard = await guardFreeMember();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("id", planId)
      .eq("client_id", guard.userId);

    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function setOwnSeasonMode(mode: "off_season" | "prep"): Promise<{ error?: string }> {
  const guard = await guardFreeMember();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("profiles")
      .update({ season_mode: mode })
      .eq("id", guard.userId);
    if (error) return { error: "Erreur lors de la sauvegarde." };

    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteOwnDietPlan(planId: string): Promise<{ error?: string }> {
  const guard = await guardFreeMember();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("diet_plans")
      .delete()
      .eq("id", planId)
      .eq("client_id", guard.userId);
    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// ── Repas enregistrés — logger un repas complet en un tap au lieu de
// rechercher/ajouter chaque aliment un par un ────────────────────────────

export async function createSavedMeal(
  name: string,
  items: { foodId: string; quantityG: number }[]
): Promise<{ error?: string; id?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };
  if (!name.trim() || items.length === 0) return { error: "Nom et au moins un aliment requis." };

  try {
    const supabase = await createServerSupabase();
    const { data: meal, error } = await supabase
      .from("saved_meals")
      .insert({ owner_id: guard.userId, name: name.trim() })
      .select("id")
      .single();
    if (error || !meal) return { error: "Erreur lors de la sauvegarde du repas." };

    const { error: itemsError } = await supabase.from("saved_meal_items").insert(
      items.map((it) => ({ saved_meal_id: meal.id, food_id: it.foodId, quantity_g: it.quantityG }))
    );
    if (itemsError) return { error: "Erreur lors de la sauvegarde des aliments du repas." };

    revalidatePath("/dashboard/client/nutrition");
    return { id: meal.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteSavedMeal(mealId: string): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    await supabase.from("saved_meals").delete().eq("id", mealId).eq("owner_id", guard.userId);
    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// Logue en une fois tous les aliments d'un repas enregistré (ou du plan
// actif) dans un créneau donné — le calcul des macros est refait ici à
// partir des données aliment officielles plutôt que de faire confiance à
// des valeurs recalculées côté client pour un lot entier.
export async function logMealItems(
  items: { foodId: string; quantityG: number }[],
  mealSlot: string,
  loggedAt: string
): Promise<{ error?: string; count?: number }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };
  if (items.length === 0) return { error: "Repas vide." };

  try {
    const admin = createAdminClient();
    const { data: foodsData } = await admin
      .from("foods")
      .select("id, calories_per_100, proteins_per_100, carbs_per_100, fats_per_100")
      .in("id", items.map((it) => it.foodId));
    const byId = new Map(
      ((foodsData ?? []) as { id: string; calories_per_100: number; proteins_per_100: number; carbs_per_100: number; fats_per_100: number }[]).map(
        (f) => [f.id, f]
      )
    );

    const rows = items
      .map((it) => {
        const food = byId.get(it.foodId);
        if (!food) return null;
        const ratio = it.quantityG / 100;
        return {
          client_id: guard.userId,
          food_id: it.foodId,
          meal_slot: mealSlot,
          quantity_g: it.quantityG,
          logged_at: loggedAt,
          calories: Math.round(food.calories_per_100 * ratio),
          proteins: Math.round(food.proteins_per_100 * ratio * 10) / 10,
          carbs: Math.round(food.carbs_per_100 * ratio * 10) / 10,
          fats: Math.round(food.fats_per_100 * ratio * 10) / 10,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) return { error: "Aucun aliment valide dans ce repas." };

    const { error } = await admin.from("food_logs").insert(rows);
    if (error) return { error: "Erreur lors de l'ajout." };

    awardPoints(guard.userId, POINTS.nutrition_log_day, "Nutrition loguée", "nutrition_log_day", loggedAt);
    revalidatePath("/dashboard/client/nutrition");
    return { count: rows.length };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// ── Compléments alimentaires ─────────────────────────────────────────────

export async function addOwnSupplement(input: {
  name: string;
  dosage?: string;
  timing?: string;
  notes?: string;
}): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };
  if (!input.name.trim()) return { error: "Le nom est requis." };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("client_supplements").insert({
      client_id: guard.userId,
      name: input.name.trim(),
      dosage: input.dosage?.trim() || null,
      timing: input.timing?.trim() || null,
      notes: input.notes?.trim() || null,
    });
    if (error) return { error: "Erreur lors de l'ajout." };
    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function setOwnSupplementStatus(
  supplementId: string,
  status: "active" | "stopped"
): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("client_supplements")
      .update({ status })
      .eq("id", supplementId)
      .eq("client_id", guard.userId);
    if (error) return { error: "Erreur lors de la mise à jour." };
    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteOwnSupplement(supplementId: string): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("client_supplements")
      .delete()
      .eq("id", supplementId)
      .eq("client_id", guard.userId);
    if (error) return { error: "Erreur lors de la suppression." };
    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
