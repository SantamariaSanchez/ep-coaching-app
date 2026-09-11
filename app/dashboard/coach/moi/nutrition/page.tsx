export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { todayInParis } from "@/lib/dates";
import {
  getNutritionProfile,
  getTodayLogs,
  getLast30DaysLogs,
  getAllFoods,
  getActiveDietPlan,
  getAllDietPlansWithMeals,
} from "@/utils/nutrition";
import CoachMoiNutritionTabs from "@/components/ui/CoachMoiNutritionTabs";
import { addFoodLog, removeFoodLog, createCustomFood, logMealItems, createSavedMeal, deleteSavedMeal, importPlanMealsAsSavedMeals } from "@/app/dashboard/client/nutrition/actions";
import { getSavedMeals } from "@/utils/saved-meals";
import {
  saveNutritionProfile,
  suggestSupplement,
  setSupplementStatus,
  deleteSupplement,
} from "@/app/dashboard/coach/clients/[id]/nutrition/actions";
import { getClientSupplements } from "@/utils/supplements";
import {
  createDietPlan,
  deactivateDietPlan,
  activateDietPlan,
  deleteDietPlan,
  updateDietPlanMode,
} from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";

export default async function CoachMonNutritionPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role, weight_start, season_mode").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const today = todayInParis();

  const [nutritionProfile, todayLogs, historyLogs, foods, activePlan, allPlans, supplements, savedMeals] = await Promise.all([
    getNutritionProfile(user.id),
    getTodayLogs(user.id, today),
    getLast30DaysLogs(user.id),
    getAllFoods(),
    getActiveDietPlan(user.id),
    getAllDietPlansWithMeals(user.id),
    getClientSupplements(user.id),
    // Manquait entièrement ici (retour direct 2026-09-09 : "dans repas et
    // recette y'a rien") : createSavedMeal/deleteSavedMeal n'étaient même
    // pas importées sur cette page, donc le bouton "Enregistrer ce repas"
    // de DietPlanCard ne s'affichait jamais pour le coach sur sa propre
    // nutrition (onSaveAsMeal exige createSavedMeal). Voir aussi le
    // correctif requireClient() → requireAuth() dans les actions elles-mêmes.
    getSavedMeals(user.id),
  ]);

  // Diagnostic temporaire (retour direct 2026-09-11, "les autres onglets et
  // refresh, ça reste plus coché") : le seul moyen de savoir depuis ici si
  // le SERVEUR renvoie vraiment les bonnes lignes (no-store) ou si le
  // problème est ailleurs (affichage) est de le journaliser au moment
  // exact où quelqu'un charge la page. À retirer une fois le diagnostic
  // terminé — voir MASTERCLASS.md Axe BX.
  console.log(
    `[diag nutrition] user=${user.id} today=${today} todayLogs=${todayLogs.length} tagged=${
      todayLogs.filter((l) => (l as { diet_plan_meal_id?: string | null }).diet_plan_meal_id).length
    }`
  );

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon suivi
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Ma nutrition</h1>
      </div>

      <CoachMoiNutritionTabs
        clientView={{
          today,
          nutritionProfile,
          initialTodayLogs: todayLogs,
          historyLogs,
          initialFoods: foods,
          dietMode: activePlan?.mode ?? "flexible",
          activePlan,
          // Repere hors-saison/prep manquant ici (present cote client, voir
          // app/dashboard/client/nutrition/page.tsx) : le coach peut deja
          // regler son season_mode depuis Moi > Photos (formulaire "Reglages
          // competition", voir CoachClientPhotosView) mais la valeur n'etait
          // jamais transmise a ClientNutritionView sur SA PROPRE page
          // Nutrition, donc le badge ne s'affichait jamais ici.
          seasonMode: profile?.season_mode,
          // Sans ça, le plan que le coach construit pour lui-même (page Moi)
          // affichait "Plan de ton coach" au lieu de "Mon plan" — le prop
          // n'était tout simplement jamais passé ici, il retombait sur son
          // défaut false.
          isOwnPlan: true,
          addFoodLog,
          removeFoodLog,
          createCustomFood,
          // Manquait ici (signalé en direct 2026-08-16, "toujours bloqué") :
          // le bouton "Valider le repas" de DietPlanCard ne s'affiche que si
          // logMealItems est fourni. Sur cette page (le coach loggue SES
          // PROPRES repas), il n'était jamais passé — seul
          // app/dashboard/client/nutrition/page.tsx l'avait, donc un client
          // voyait le bouton mais pas le fondateur sur "Ma nutrition".
          logMealItems,
          savedMeals,
          createSavedMeal,
          deleteSavedMeal,
          importPlanMealsAsSavedMeals,
          // Changer le mode fixe/flexible directement depuis le suivi du
          // jour (2026-08-17), pas seulement depuis l'onglet "Gérer" plus
          // bas. Réutilise updateDietPlanMode déjà importé pour manageProps,
          // lié à son propre id (le coach agit sur SON PROPRE plan ici).
          updatePlanMode: updateDietPlanMode.bind(null, user.id),
        }}
        manageProps={{
          clientId: user.id,
          clientWeight: profile?.weight_start ?? null,
          nutritionProfile,
          todayLogs,
          historyLogs,
          foods,
          activePlan,
          allPlans,
          today,
          supplements,
          subjectLabel: "moi",
          // "Suivi du jour" et "Historique alimentaire" existent déjà en
          // interactif sous l'onglet du dessus (voir CoachMoiNutritionTabs) —
          // sans ce flag, CoachClientNutritionTabs les réaffichait en double,
          // en lecture seule.
          isOwnPlan: true,
          saveNutritionProfile,
          createDietPlan,
          deactivateDietPlan,
          activateDietPlan,
          deleteDietPlan,
          updateDietPlanMode,
          suggestSupplement,
          setSupplementStatus,
          deleteSupplement,
        }}
      />
    </div>
  );
}
