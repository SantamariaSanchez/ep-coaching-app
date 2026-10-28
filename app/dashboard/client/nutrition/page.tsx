import { getT } from "@/lib/i18n-server";
import { todayInParis } from "@/lib/dates";
import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import {
  getNutritionProfile,
  getTodayLogs,
  getLast30DaysLogs,
  getAllFoods,
  getActiveDietPlan,
  getAllDietPlansWithMeals,
  getMostLoggedFoodsGlobal,
} from "@/utils/nutrition";
import { getLatestWeight, getClientDailyLogs } from "@/utils/daily-logs";
import { getCommunityRecipes } from "@/utils/community-recipes";
import { getSavedMeals } from "@/utils/saved-meals";
import { getClientIntake } from "@/utils/client-intake";
import { getEatingRelation } from "@/lib/eating-safety-server";
import { getClientSupplements } from "@/utils/supplements";
import { getScheduleBlocks } from "@/utils/agenda";
import { getTrainingDays } from "@/utils/training-days";
import { mealTimesForDate } from "@/lib/meal-times";
import { ChevronDown } from "lucide-react";
import ClientNutritionView from "@/components/ui/ClientNutritionView";
import ClientNudge from "@/components/ui/ClientNudge";
import NutritionForm from "@/components/ui/NutritionForm";
import OwnDietPlansSection from "@/components/ui/OwnDietPlansSection";
import SeasonModeToggle from "@/components/ui/SeasonModeToggle";
import SupplementsSection from "@/components/ui/SupplementsSection";
import {
  addFoodLog,
  removeFoodLog,
  createCustomFood,
  saveOwnNutritionProfile,
  createOwnDietPlan,
  activateOwnDietPlan,
  deactivateOwnDietPlan,
  deleteOwnDietPlan,
  updateOwnDietPlanMode,
  setOwnSeasonMode,
  setOwnEatingRelation,
  createSavedMeal,
  deleteSavedMeal,
  importPlanMealsAsSavedMeals,
  logMealItems,
  addOwnSupplement,
  setOwnSupplementStatus,
  deleteOwnSupplement,
} from "./actions";

export default async function ClientNutritionPage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  // Retombait sur le dashboard générique au lieu de sa propre page nutrition
  // (voir le même garde-fou déjà correct dans bilan/page.tsx et steps/page.tsx,
  // qui redirigent vers coach/moi/*) — trouvé en auditant public/manifest.json,
  // le raccourci PWA "Nutrition" du menu d'accueil pointe justement ici et
  // atterrissait donc au mauvais endroit pour un compte coach.
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/nutrition");

  const today = todayInParis();
  // Heures des repas posées dans l'agenda aujourd'hui et jours de séance du
  // programme : le repas du moment affiche tout de suite le bon « quand », et
  // la journée dit si c'est un jour d'entraînement ou de repos.
  const agendaAndTraining = Promise.all([
    getScheduleBlocks(user.id).then((blocks) => mealTimesForDate(blocks, today)).catch(() => ({}) as Record<string, string>),
    getTrainingDays(user.id),
  ]);

  // Espace gratuit — calculateur TDEE + journal alimentaire (aujourd'hui /
  // historique) et plans perso, comme les clients coachés : seule la
  // provenance du plan change (auto-géré, pas de coach).
  if (!isSubscribed(profile)) {
    const [nutritionProfile, todayLogs, historyLogs, foods, activePlan, ownPlans, recipes, latestWeight, recentDailyLogs, savedMeals, mostUsedGlobal, intake, supplements, [agendaMealTimes, trainingDays], eatingRelation] =
      await Promise.all([
        getNutritionProfile(user.id),
        getTodayLogs(user.id, today),
        getLast30DaysLogs(user.id),
        getAllFoods(),
        getActiveDietPlan(user.id),
        getAllDietPlansWithMeals(user.id),
        getCommunityRecipes(),
        getLatestWeight(user.id),
        getClientDailyLogs(user.id, 21),
        getSavedMeals(user.id),
        getMostLoggedFoodsGlobal(),
        getClientIntake(user.id),
        getClientSupplements(user.id),
        agendaAndTraining,
        getEatingRelation(user.id),
      ]);

    // Calculateur : en tête tant qu'aucun besoin n'est enregistré (c'est
    // la première chose à faire), replié sous la journée ensuite.
    const calculator = (
      <>
        <SeasonModeToggle
          currentMode={profile?.season_mode ?? "off_season"}
          setSeasonMode={setOwnSeasonMode}
        />
        <NutritionForm
          clientId={user.id}
          existingProfile={nutritionProfile}
          clientWeight={latestWeight ?? profile?.weight_start ?? null}
          recentDailyLogs={recentDailyLogs}
          saveNutritionProfile={saveOwnNutritionProfile}
          eatingRelation={eatingRelation}
          setEatingRelation={setOwnEatingRelation}
        />
      </>
    );

    return (
      <div className="pb-24 md:pb-8 page-transition">
        <ClientNudge userId={user.id} />
        {!nutritionProfile && (
          <div className="px-4 pt-5 ep-page-medium">
            <p className="ep-section-title" style={{ marginBottom: 2 }}>{t("Nutrition")}</p>
            <h1 className="ep-h1 uppercase" style={{ fontSize: 30 }}>{t("Calculateur calorique")}</h1>
            <p className="text-sm text-(--ep-ink)/55 mt-2 mb-4 leading-relaxed">
              {t("Calcule tes besoins caloriques et tes macros selon ton profil et ton objectif. Sauvegarde le résultat pour le conserver.")}
            </p>
            {calculator}
          </div>
        )}

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
          intake={intake}
          savedMeals={savedMeals}
          mostUsedGlobal={mostUsedGlobal}
          addFoodLog={addFoodLog}
          removeFoodLog={removeFoodLog}
          createCustomFood={createCustomFood}
          createSavedMeal={createSavedMeal}
          deleteSavedMeal={deleteSavedMeal}
          importPlanMealsAsSavedMeals={importPlanMealsAsSavedMeals}
          logMealItems={logMealItems}
          updatePlanMode={updateOwnDietPlanMode}
          agendaMealTimes={agendaMealTimes}
          trainingDays={trainingDays}
          planHref="#mes-plans"
        />

        {nutritionProfile && (
          <div className="px-4 ep-page-medium">
            <details className="group rounded-2xl border border-(--ep-line)/25 bg-(--ep-s1)">
              <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer min-h-[52px] px-3.5 flex items-center gap-2.5">
                <span className="flex-1 min-w-0">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-(--ep-ink)/45">{t("Mes besoins")}</span>
                  <span className="block text-[13px] font-bold text-(--ep-strong) truncate">
                    {nutritionProfile.calories_target ? `${nutritionProfile.calories_target} kcal · P ${nutritionProfile.proteins_target ?? 0} g · G ${nutritionProfile.carbs_target ?? 0} g · L ${nutritionProfile.fats_target ?? 0} g` : t("Calculateur calorique")}
                  </span>
                </span>
                <span className="text-[10.5px] font-black uppercase tracking-wider text-(--ep-accent-hi2) whitespace-nowrap">{t("Recalculer")}</span>
                <ChevronDown size={16} className="text-(--ep-ink)/40 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-3.5 pb-4">{calculator}</div>
            </details>
          </div>
        )}

        <div id="mes-plans" className="scroll-mt-20" />
        <OwnDietPlansSection
          foods={foods}
          plans={ownPlans}
          targets={
            nutritionProfile?.calories_target
              ? { calories: nutritionProfile.calories_target, proteins: nutritionProfile.proteins_target ?? 0, carbs: nutritionProfile.carbs_target ?? 0, fats: nutritionProfile.fats_target ?? 0 }
              : null
          }
          createOwnDietPlan={createOwnDietPlan}
          activateOwnDietPlan={activateOwnDietPlan}
          deactivateOwnDietPlan={deactivateOwnDietPlan}
          deleteOwnDietPlan={deleteOwnDietPlan}
        />

        <div className="px-4 ep-page-medium mt-6">
          <SupplementsSection
            supplements={supplements}
            onAdd={addOwnSupplement}
            onSetStatus={setOwnSupplementStatus}
            onDelete={deleteOwnSupplement}
          />
        </div>
      </div>
    );
  }

  const [nutritionProfile, todayLogs, historyLogs, foods, activePlan, recipes, savedMeals, mostUsedGlobal, intake, supplements, [agendaMealTimes, trainingDays]] =
    await Promise.all([
      getNutritionProfile(user.id),
      getTodayLogs(user.id, today),
      getLast30DaysLogs(user.id),
      getAllFoods(),
      getActiveDietPlan(user.id),
      getCommunityRecipes(),
      getSavedMeals(user.id),
      getMostLoggedFoodsGlobal(),
      getClientIntake(user.id),
      getClientSupplements(user.id),
      agendaAndTraining,
    ]);

  return (
    <div className="pb-24 md:pb-8">
      <ClientNudge userId={user.id} />
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
        intake={intake}
        savedMeals={savedMeals}
        mostUsedGlobal={mostUsedGlobal}
        addFoodLog={addFoodLog}
        removeFoodLog={removeFoodLog}
        createCustomFood={createCustomFood}
        createSavedMeal={createSavedMeal}
        deleteSavedMeal={deleteSavedMeal}
        importPlanMealsAsSavedMeals={importPlanMealsAsSavedMeals}
        logMealItems={logMealItems}
        agendaMealTimes={agendaMealTimes}
        trainingDays={trainingDays}
      />
      <div className="px-4 ep-page-medium mt-6">
        <SupplementsSection
          supplements={supplements}
          onAdd={addOwnSupplement}
          onSetStatus={setOwnSupplementStatus}
          onDelete={deleteOwnSupplement}
        />
      </div>
    </div>
  );
}
