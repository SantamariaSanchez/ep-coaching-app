"use server";
import { requireOwnClientOrSelf } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import type { NutritionProfileInput } from "@/utils/nutrition";

export async function saveNutritionProfile(
  clientId: string,
  data: NutritionProfileInput
): Promise<{ error?: string }> {
  const guard = await requireOwnClientOrSelf(clientId);
  if (!guard.ok) return { error: guard.error };
  try {
    // Use admin client - coach writes to another user profile (bypasses RLS)
    const supabase = createAdminClient();

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
      weight: data.weight ?? null,
      height: data.height,
      age: data.age,
      training_type: data.training_type,
      sessions_per_week: data.sessions_per_week,
      session_duration: data.session_duration,
      steps_per_day: data.steps_per_day,
      activity_level: data.activity_level,
      updated_at: new Date().toISOString(),
    };

    // Explicit select-then-update-or-insert instead of upsert(onConflict):
    // this doesn't depend on a unique constraint actually existing on
    // client_id in the live DB, which is what let stale duplicate rows
    // pile up and made saves look like they "kept the old data".
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
      // Clean up any extra duplicate rows from past buggy upserts
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
      console.error("saveNutritionProfile error:", error);
      return { error: "Erreur lors de la sauvegarde." };
    }

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);
    revalidatePath(`/dashboard/coach/moi/nutrition`);
    return {};
  } catch (e) {
    console.error("saveNutritionProfile exception:", e);
    return { error: "Erreur inattendue." };
  }
}
