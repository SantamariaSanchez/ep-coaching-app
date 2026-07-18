import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getCommunityRecipes } from "@/utils/community-recipes";
import { getAllFoods } from "@/utils/nutrition";
import { getTotalPoints } from "@/lib/gamification";
import { getClientIntake } from "@/utils/client-intake";
import RecipesClient from "@/components/recipes/RecipesClient";
import { createCommunityRecipe, deleteCommunityRecipe } from "./actions";
import { createCustomFood } from "@/app/dashboard/client/nutrition/actions";

export default async function ClientRecettesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/recettes");

  const [communityRecipes, foods, points, intake] = await Promise.all([
    getCommunityRecipes(),
    getAllFoods(),
    getTotalPoints(user.id),
    getClientIntake(user.id),
  ]);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Contenu
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Recettes & idées repas</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Toutes les recettes triées par régime, phase (surplus, maintenance, sèche), macros,
          allergènes, saison et goûts, produits français de saison. Ajoute les tiennes ou
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
        createCustomFood={createCustomFood}
        presetDiet={intake?.diet_type ?? null}
        presetAllergens={intake ? intake.allergens : null}
      />
    </div>
  );
}
