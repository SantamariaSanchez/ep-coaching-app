"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { getUser } from "@/utils/auth";
import { requireClient } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import type { Food, NutritionProfileInput } from "@/utils/nutrition";

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
  const { error } = await supabase.from("nutrition_profiles").upsert(
    {
      client_id: clientId,
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
    },
    { onConflict: "client_id" }
  );

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

    const supabase = await createServerSupabase();
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
