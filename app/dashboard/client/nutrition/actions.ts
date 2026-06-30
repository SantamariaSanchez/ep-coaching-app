"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
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
  foodId: string;
  mealSlot: string;
  quantityG: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  loggedAt: string;
}): Promise<{ id?: string; error?: string }> {
  try {
    const user = await getUser();
    if (!user) return { error: "Non authentifié" };

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("food_logs")
      .insert({
        client_id: user.id,
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

    awardPoints(user.id, POINTS.nutrition_log_day, "Nutrition loguée", "nutrition_log_day", params.loggedAt);

    return { id: data.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function removeFoodLog(
  logId: string
): Promise<{ error?: string }> {
  try {
    const user = await getUser();
    if (!user) return { error: "Non authentifié" };

    const supabase = await createServerSupabase();
    await supabase
      .from("food_logs")
      .delete()
      .eq("id", logId)
      .eq("client_id", user.id);

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
    const user = await getUser();
    if (!user) return { error: "Non authentifié" };

    // Admin client — bypasses RLS regardless of how the foods table was set
    // up, since this is shared reference content.
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("foods")
      .insert({
        ...params,
        is_custom: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !data) return { error: "Erreur lors de la création." };
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
