"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { getUser } from "@/utils/auth";
import type { Food } from "@/utils/nutrition";

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
