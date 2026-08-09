import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import {
  getNutritionProfile,
  getTodayLogs,
  getLast30DaysLogs,
  getAllFoods,
  getActiveDietPlan,
  getAllDietPlansWithMeals,
} from "@/utils/nutrition";
import { getLatestWeight, getClientDailyLogs } from "@/utils/daily-logs";
import { getClientSupplements } from "@/utils/supplements";
import { getClientIntake } from "@/utils/client-intake";
import { getClientRoadmap } from "@/utils/roadmap";
import { getCoachDietTemplates } from "@/utils/diet-templates";
import { createDietTemplateAction } from "@/app/dashboard/coach/programmation/diet/actions";
import {
  saveNutritionProfile,
  suggestSupplement,
  setSupplementStatus,
  deleteSupplement,
} from "./actions";
import {
  createDietPlan,
  deactivateDietPlan,
  activateDietPlan,
  deleteDietPlan,
  updateDietPlanMode,
} from "./diet-plan-actions";
import CoachClientNutritionTabs from "@/components/ui/CoachClientNutritionTabs";
import SeasonModeBadge from "@/components/ui/SeasonModeBadge";
import { ChevronLeft } from "lucide-react";

export default async function CoachClientNutritionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client] = await Promise.all([
    getProfile(user.id),
    getClientById(id, user.id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  const today = new Date().toISOString().split("T")[0];

  const [nutritionProfile, todayLogs, historyLogs, foods, activePlan, allPlans, latestWeight, recentDailyLogs, supplements, dietTemplates, intake, roadmap] =
    await Promise.all([
      getNutritionProfile(id),
      getTodayLogs(id, today),
      getLast30DaysLogs(id),
      getAllFoods(),
      getActiveDietPlan(id),
      getAllDietPlansWithMeals(id),
      getLatestWeight(id),
      getClientDailyLogs(id, 21),
      getClientSupplements(id),
      getCoachDietTemplates(user.id),
      // Sans ça, ClientReferenceCard et PlanBuilder recevaient intake=null en
      // silence : la vérification allergènes/régime/aliments détestés
      // n'était jamais active sur cette page (elle l'était ailleurs, où la
      // fiche était bien transmise) — même défaut que le "matériel suggéré
      // sans vérifier le lieu d'entraînement" côté programme.
      getClientIntake(id),
      getClientRoadmap(id),
    ]);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto page-transition">
      <Link
        href={`/dashboard/coach/clients/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        {client.full_name}
      </Link>

      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Nutrition
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          {client.full_name}
          {client.competition_category && <SeasonModeBadge mode={client.season_mode} />}
        </h1>
      </div>

      <CoachClientNutritionTabs
        clientId={id}
        clientWeight={latestWeight ?? client.weight_start}
        recentDailyLogs={recentDailyLogs}
        nutritionProfile={nutritionProfile}
        todayLogs={todayLogs}
        historyLogs={historyLogs}
        foods={foods}
        activePlan={activePlan}
        allPlans={allPlans}
        today={today}
        supplements={supplements}
        dietTemplates={dietTemplates}
        saveDietAsTemplate={createDietTemplateAction}
        subjectLabel={client.full_name ?? "ce client"}
        intake={intake}
        roadmap={roadmap}
        roadmapHref={`/dashboard/coach/clients/${id}/roadmap`}
        saveNutritionProfile={saveNutritionProfile}
        createDietPlan={createDietPlan}
        deactivateDietPlan={deactivateDietPlan}
        activateDietPlan={activateDietPlan}
        deleteDietPlan={deleteDietPlan}
        updateDietPlanMode={updateDietPlanMode}
        suggestSupplement={suggestSupplement}
        setSupplementStatus={setSupplementStatus}
        deleteSupplement={deleteSupplement}
      />
    </div>
  );
}
