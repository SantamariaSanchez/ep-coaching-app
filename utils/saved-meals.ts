import { createServerSupabase } from "@/lib/supabase-server";
import type { Food } from "@/utils/nutrition";

export interface SavedMealItem {
  id: string;
  food_id: string;
  quantity_g: number;
  foods: Food | null;
}

export interface SavedMeal {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  saved_meal_items: SavedMealItem[];
}

export async function getSavedMeals(ownerId: string): Promise<SavedMeal[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("saved_meals")
      .select("*, saved_meal_items(*, foods(*))")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    return (data as SavedMeal[]) ?? [];
  } catch {
    return [];
  }
}
