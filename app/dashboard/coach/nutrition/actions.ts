"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { requireCoach } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { FOODS_SEED } from "@/lib/foods-seed";

// Imports the official food database straight from the app's code (see
// lib/foods-seed.ts) instead of pasting hundreds of SQL rows by hand in the
// Supabase editor — safe to click more than once (only inserts names that
// don't already exist).
export async function seedOfficialFoods(): Promise<{ error?: string; inserted?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase.from("foods").select("name");
    if (fetchError) return { error: "Erreur lors de la lecture de la base d'aliments." };

    const existingNames = new Set((existing ?? []).map((r) => r.name));
    const missing = FOODS_SEED.filter((f) => !existingNames.has(f.name));
    if (missing.length === 0) return { inserted: 0 };

    const { error } = await supabase.from("foods").insert(
      missing.map((f) => ({
        name: f.name,
        category: f.category,
        calories_per_100: f.calories_per_100,
        proteins_per_100: f.proteins_per_100,
        carbs_per_100: f.carbs_per_100,
        fats_per_100: f.fats_per_100,
        fibers_per_100: f.fibers_per_100,
        is_custom: false,
        created_by: null,
      }))
    );
    if (error) return { error: "Erreur lors de l'import." };

    revalidatePath("/dashboard/coach/nutrition");
    revalidatePath("/dashboard/client/nutrition");
    return { inserted: missing.length };
  } catch {
    return { error: "Erreur inattendue." };
  }
}
