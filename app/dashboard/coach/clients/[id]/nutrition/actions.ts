"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { NutritionProfileInput } from "@/utils/nutrition";

export async function saveNutritionProfile(
  clientId: string,
  data: NutritionProfileInput
): Promise<{ error?: string }> {
  try {
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
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" }
    );

    if (error) return { error: "Erreur lors de la sauvegarde." };

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
