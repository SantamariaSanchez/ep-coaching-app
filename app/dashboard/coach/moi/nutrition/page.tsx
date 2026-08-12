export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  getNutritionProfile,
  getTodayLogs,
  getLast30DaysLogs,
  getAllFoods,
  getActiveDietPlan,
  getAllDietPlansWithMeals,
} from "@/utils/nutrition";
import CoachMoiNutritionTabs from "@/components/ui/CoachMoiNutritionTabs";
import { addFoodLog, removeFoodLog, createCustomFood } from "@/app/dashboard/client/nutrition/actions";
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

  const { data: profile } = await supabase.from("profiles").select("role, weight_start").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const today = new Date().toISOString().split("T")[0];

  const [nutritionProfile, todayLogs, historyLogs, foods, activePlan, allPlans, supplements] = await Promise.all([
    getNutritionProfile(user.id),
    getTodayLogs(user.id, today),
    getLast30DaysLogs(user.id),
    getAllFoods(),
    getActiveDietPlan(user.id),
    getAllDietPlansWithMeals(user.id),
    getClientSupplements(user.id),
  ]);

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
          // Sans ça, le plan que le coach construit pour lui-même (page Moi)
          // affichait "Plan de ton coach" au lieu de "Mon plan" — le prop
          // n'était tout simplement jamais passé ici, il retombait sur son
          // défaut false.
          isOwnPlan: true,
          addFoodLog,
          removeFoodLog,
          createCustomFood,
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
