import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import {
  getNutritionProfile,
  getTodayLogs,
  getLast30DaysLogs,
  getAllFoods,
  getActiveDietPlan,
  getAllDietPlansWithMeals,
} from "@/utils/nutrition";
import { getCommunityRecipes } from "@/utils/community-recipes";
import ClientNutritionView from "@/components/ui/ClientNutritionView";
import NutritionForm from "@/components/ui/NutritionForm";
import OwnDietPlansSection from "@/components/ui/OwnDietPlansSection";
import SeasonModeToggle from "@/components/ui/SeasonModeToggle";
import {
  addFoodLog,
  removeFoodLog,
  createCustomFood,
  saveOwnNutritionProfile,
  createOwnDietPlan,
  activateOwnDietPlan,
  deactivateOwnDietPlan,
  deleteOwnDietPlan,
  setOwnSeasonMode,
} from "./actions";

export default async function ClientNutritionPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const today = new Date().toISOString().split("T")[0];

  // Espace gratuit — calculateur TDEE + journal alimentaire (aujourd'hui /
  // historique) et plans perso, comme les clients coachés : seule la
  // provenance du plan change (auto-géré, pas de coach).
  if (!isSubscribed(profile)) {
    const [nutritionProfile, todayLogs, historyLogs, foods, activePlan, ownPlans, recipes] =
      await Promise.all([
        getNutritionProfile(user.id),
        getTodayLogs(user.id, today),
        getLast30DaysLogs(user.id),
        getAllFoods(),
        getActiveDietPlan(user.id),
        getAllDietPlansWithMeals(user.id),
        getCommunityRecipes(),
      ]);

    return (
      <div className="pb-24 md:pb-8 page-transition">
        <div className="px-6 pt-8 max-w-2xl mx-auto">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
              Nutrition
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tight">Calculateur calorique</h1>
            <p className="text-sm text-[#F5EDED]/45 mt-2 leading-relaxed">
              Calcule tes besoins caloriques et tes macros selon ton profil et ton objectif. Sauvegarde le résultat pour le conserver.
            </p>
          </div>
          <SeasonModeToggle
            currentMode={profile?.season_mode ?? "off_season"}
            setSeasonMode={setOwnSeasonMode}
          />
          <NutritionForm
            clientId={user.id}
            existingProfile={nutritionProfile}
            clientWeight={profile?.weight_start ?? null}
            saveNutritionProfile={saveOwnNutritionProfile}
          />
        </div>

        <ClientNutritionView
          today={today}
          nutritionProfile={nutritionProfile}
          initialTodayLogs={todayLogs}
          historyLogs={historyLogs}
          initialFoods={foods}
          recipes={recipes}
          dietMode={activePlan?.mode ?? "flexible"}
          activePlan={activePlan}
          seasonMode={profile?.season_mode}
          isOwnPlan
          addFoodLog={addFoodLog}
          removeFoodLog={removeFoodLog}
          createCustomFood={createCustomFood}
        />

        <OwnDietPlansSection
          foods={foods}
          plans={ownPlans}
          createOwnDietPlan={createOwnDietPlan}
          activateOwnDietPlan={activateOwnDietPlan}
          deactivateOwnDietPlan={deactivateOwnDietPlan}
          deleteOwnDietPlan={deleteOwnDietPlan}
        />
      </div>
    );
  }

  const [nutritionProfile, todayLogs, historyLogs, foods, activePlan, recipes] =
    await Promise.all([
      getNutritionProfile(user.id),
      getTodayLogs(user.id, today),
      getLast30DaysLogs(user.id),
      getAllFoods(),
      getActiveDietPlan(user.id),
      getCommunityRecipes(),
    ]);

  return (
    <ClientNutritionView
      today={today}
      nutritionProfile={nutritionProfile}
      initialTodayLogs={todayLogs}
      historyLogs={historyLogs}
      initialFoods={foods}
      recipes={recipes}
      dietMode={activePlan?.mode ?? "flexible"}
      activePlan={activePlan}
      seasonMode={profile?.season_mode}
      addFoodLog={addFoodLog}
      removeFoodLog={removeFoodLog}
      createCustomFood={createCustomFood}
    />
  );
}
