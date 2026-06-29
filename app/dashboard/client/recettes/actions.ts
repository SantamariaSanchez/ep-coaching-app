"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type {
  Allergen,
  Diet,
  MealType,
  Phase,
  Season,
  Temp,
} from "@/lib/recipes-data";

export interface CommunityRecipeInput {
  name: string;
  meal: MealType;
  diet: Diet[];
  phases: Phase[];
  season: Season[];
  temp: Temp;
  texture: string[];
  price: 1 | 2 | 3;
  region: string;
  prep_minutes: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  allergens: Allergen[];
  ingredients: string[];
  steps: string[];
  tip: string;
}

export async function createCommunityRecipe(
  input: CommunityRecipeInput
): Promise<{ error?: string; id?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    if (!input.name.trim()) return { error: "Le nom de la recette est requis." };
    if (input.ingredients.filter((i) => i.trim()).length === 0) {
      return { error: "Ajoute au moins un ingrédient." };
    }

    const { data, error } = await supabase
      .from("community_recipes")
      .insert({
        author_id: user.id,
        name: input.name.trim(),
        meal: input.meal,
        diet: input.diet,
        phases: input.phases,
        season: input.season,
        temp: input.temp,
        texture: input.texture,
        price: input.price,
        region: input.region.trim() || null,
        prep_minutes: input.prep_minutes,
        kcal: input.kcal,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
        allergens: input.allergens,
        ingredients: input.ingredients.filter((i) => i.trim()),
        steps: input.steps.filter((s) => s.trim()),
        tip: input.tip.trim() || null,
      })
      .select("id")
      .single();

    if (error) return { error: "Erreur lors de la publication de la recette." };

    revalidatePath("/dashboard/client/recettes");
    revalidatePath("/dashboard/coach/recettes");
    return { id: data.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteCommunityRecipe(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Non authentifié." };

    const { error } = await supabase.from("community_recipes").delete().eq("id", id);
    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath("/dashboard/client/recettes");
    revalidatePath("/dashboard/coach/recettes");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
