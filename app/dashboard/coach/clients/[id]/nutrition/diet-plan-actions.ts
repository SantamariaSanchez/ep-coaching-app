"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { requireOwnClientOrSelf } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import type { DietMode, DietStructure, DayOfWeek } from "@/utils/nutrition";

export interface DietPlanMealInput {
  meal_slot: string;
  food_id: string;
  quantity_g: number;
  position: number;
  day_of_week?: DayOfWeek | null;
}

// Colonne `objective` ajoutée par la migration 20260806, exécutée à la main
// dans le SQL Editor : tant qu'elle n'est pas passée, on recrée le plan sans
// elle plutôt que de casser la création de plan en production.
function isUnknownColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return /does not exist|could not find the .* column/i.test(error.message ?? "");
}

export async function createDietPlan(
  clientId: string,
  name: string,
  mode: DietMode,
  meals: DietPlanMealInput[],
  structure: DietStructure = "daily",
  objective?: string | null
): Promise<{ error?: string; id?: string }> {
  try {
    const guard = await requireOwnClientOrSelf(clientId);
    if (!guard.ok) return { error: guard.error };

    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

    // Deactivate previous plans
    await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("client_id", clientId)
      .eq("is_active", true);

    const baseRow = {
      client_id: clientId,
      name,
      mode,
      structure,
      is_active: true,
      created_by: guard.userId,
    };

    // Create new plan
    let { data: plan, error: planError } = await supabase
      .from("diet_plans")
      .insert({ ...baseRow, objective: objective?.trim() || null })
      .select("id")
      .single();

    if (planError && isUnknownColumnError(planError)) {
      ({ data: plan, error: planError } = await supabase
        .from("diet_plans")
        .insert(baseRow)
        .select("id")
        .single());
    }

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
    revalidatePath(`/dashboard/coach/moi/nutrition`);
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
    const guard = await requireOwnClientOrSelf(clientId);
    if (!guard.ok) return { error: guard.error };

    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
    await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("id", planId)
      .eq("client_id", clientId);

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);
    revalidatePath(`/dashboard/coach/moi/nutrition`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function activateDietPlan(
  clientId: string,
  planId: string
): Promise<{ error?: string }> {
  try {
    const guard = await requireOwnClientOrSelf(clientId);
    if (!guard.ok) return { error: guard.error };

    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

    // Only one active plan per client at a time
    await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("client_id", clientId)
      .eq("is_active", true);

    await supabase
      .from("diet_plans")
      .update({ is_active: true })
      .eq("id", planId)
      .eq("client_id", clientId);

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);
    revalidatePath(`/dashboard/coach/moi/nutrition`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteDietPlan(
  clientId: string,
  planId: string
): Promise<{ error?: string }> {
  try {
    const guard = await requireOwnClientOrSelf(clientId);
    if (!guard.ok) return { error: guard.error };

    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
    const { error } = await supabase
      .from("diet_plans")
      .delete()
      .eq("id", planId)
      .eq("client_id", clientId);
    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);
    revalidatePath(`/dashboard/coach/moi/nutrition`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
