import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getCommunityRecipes } from "@/utils/community-recipes";
import { getAllFoods } from "@/utils/nutrition";
import { getTotalPoints } from "@/lib/gamification";
import RecipesClient from "@/components/recipes/RecipesClient";
import { createCommunityRecipe, deleteCommunityRecipe } from "./actions";

export default async function ClientRecettesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/recettes");

  const [communityRecipes, foods, points] = await Promise.all([
    getCommunityRecipes(),
    getAllFoods(),
    getTotalPoints(user.id),
  ]);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
          Contenu
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Recettes & idées repas</h1>
        <p className="text-sm text-[var(--color-ep-light)]/45 mt-2">
          Toutes les recettes triées par régime, phase (surplus, maintenance, sèche), macros,
          allergènes, saison et goûts — produits français de saison. Ajoute les tiennes ou
          crée une recette 100% sur mesure.
        </p>
      </div>

      <RecipesClient
        communityRecipes={communityRecipes}
        foods={foods}
        currentUserId={user.id}
        isCoach={false}
        points={points}
        isSubscribed={isSubscribed(profile)}
        createRecipe={createCommunityRecipe}
        deleteRecipe={deleteCommunityRecipe}
      />
    </div>
  );
}
