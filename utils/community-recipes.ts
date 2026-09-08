import { createServerSupabase } from "@/lib/supabase-server";
import { resolveAvatarUrls } from "@/utils/avatar";
import type {
  Allergen,
  Diet,
  MealType,
  Phase,
  Season,
  Temp,
} from "@/lib/recipes-data";

export interface CommunityRecipe {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  name: string;
  meal: MealType;
  diet: Diet[];
  phases: Phase[];
  season: Season[];
  temp: Temp;
  texture: string[];
  price: 1 | 2 | 3;
  region: string | null;
  prep_minutes: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  allergens: Allergen[];
  ingredients: string[];
  steps: string[];
  tip: string | null;
  created_at: string;
  foods_used?: { food_id: string; grams: number }[] | null;
}

export async function getCommunityRecipes(): Promise<CommunityRecipe[]> {
  try {
    const supabase = await createServerSupabase();
    const { data: recipes } = await supabase
      .from("community_recipes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!recipes || recipes.length === 0) return [];

    const authorIds = [...new Set(recipes.map((r) => r.author_id as string))];
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", authorIds);

    type AuthorRow = { id: string; full_name: string | null; avatar_url: string | null };
    const authorMap: Record<string, AuthorRow> = {};
    for (const a of (authors ?? []) as AuthorRow[]) {
      authorMap[a.id] = a;
    }
    // Le bucket avatars est privé : avatar_url en base n'est qu'un chemin,
    // jamais une URL affichable telle quelle (voir utils/avatar.ts).
    const resolvedAvatars = await resolveAvatarUrls(
      (authors ?? []).map((a) => ({ id: a.id as string, avatar_url: a.avatar_url as string | null }))
    );

    return recipes.map((r) => ({
      ...r,
      author_name: authorMap[r.author_id]?.full_name ?? "Membre",
      author_avatar_url: resolvedAvatars[r.author_id] ?? null,
    })) as CommunityRecipe[];
  } catch {
    return [];
  }
}
