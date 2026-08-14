"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
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
  // Présent seulement pour les recettes issues du créateur de repas (voir
  // migration 20260808b) — permet le bouton "Loguer aujourd'hui".
  foods_used?: { food_id: string; grams: number }[];
}

export async function createCommunityRecipe(
  input: CommunityRecipeInput
): Promise<{ error?: string; id?: string }> {
  try {
    // requireAuth() plutôt qu'un getUser() nu : la publication est ouverte
    // aux clients comme au coach, mais reste une écriture, donc soumise à la
    // 2FA quand le compte l'a activée.
    const guard = await requireAuth();
    if (!guard.ok) return { error: guard.error };
    const supabase = await createServerSupabase();

    if (!input.name.trim()) return { error: "Le nom de la recette est requis." };
    if (input.ingredients.filter((i) => i.trim()).length === 0) {
      return { error: "Ajoute au moins un ingrédient." };
    }

    const { data, error } = await supabase
      .from("community_recipes")
      .insert({
        author_id: guard.userId,
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
        foods_used: input.foods_used && input.foods_used.length > 0 ? input.foods_used : null,
      })
      .select("id")
      .single();

    if (error) return { error: "Erreur lors de la publication de la recette." };

    revalidatePath("/dashboard/client/recettes");
    revalidatePath("/dashboard/coach/recettes");
    return { id: data.id };
  } catch (e) {
    console.error("createCommunityRecipe error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteCommunityRecipe(id: string): Promise<{ error?: string }> {
  try {
    const guard = await requireAuth();
    if (!guard.ok) return { error: guard.error };

    // Défense en profondeur : la RLS autorise déjà l'auteur ou un coach,
    // on redit la même règle ici plutôt que de dépendre d'elle seule.
    const admin = createAdminClient();
    const { data: recipe } = await admin
      .from("community_recipes")
      .select("author_id")
      .eq("id", id)
      .maybeSingle();
    if (!recipe) return { error: "Recette introuvable." };
    if (recipe.author_id !== guard.userId && guard.role !== "coach") {
      return { error: "Tu ne peux supprimer que tes propres recettes." };
    }

    const supabase = await createServerSupabase();
    const { error } = await supabase.from("community_recipes").delete().eq("id", id);
    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath("/dashboard/client/recettes");
    revalidatePath("/dashboard/coach/recettes");
    return {};
  } catch (e) {
    console.error("deleteCommunityRecipe error:", e);
    return { error: "Erreur inattendue." };
  }
}
