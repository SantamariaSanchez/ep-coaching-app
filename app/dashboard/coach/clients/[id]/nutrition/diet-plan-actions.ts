"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { getUser } from "@/utils/auth";
import { revalidatePath } from "next/cache";
import type { DietMode } from "@/utils/nutrition";

export interface DietPlanMealInput {
  meal_slot: string;
  food_id: string;
  quantity_g: number;
  position: number;
}

export async function createDietPlan(
  clientId: string,
  name: string,
  mode: DietMode,
  meals: DietPlanMealInput[]
): Promise<{ error?: string; id?: string }> {
  try {
    const user = await getUser();
    if (!user) return { error: "Non authentifié" };

    const supabase = await createServerSupabase();

    // Deactivate previous plans
    await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("client_id", clientId)
      .eq("is_active", true);

    // Create new plan
    const { data: plan, error: planError } = await supabase
      .from("diet_plans")
      .insert({
        client_id: clientId,
        name,
        mode,
        is_active: true,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (planError || !plan) return { error: "Erreur lors de la création du plan." };

    // Insert meals
    if (meals.length > 0) {
      const { error: mealsError } = await supabase
        .from("diet_plan_meals")
        .insert(meals.map((m) => ({ ...m, plan_id: plan.id })));

      if (mealsError) return { error: "Erreur lors de l'ajout des repas." };
    }

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);
    return { id: plan.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deactivateDietPlan(
  clientId: string,
  planId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createServerSupabase();
    await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("id", planId);

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
