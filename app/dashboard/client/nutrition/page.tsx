import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import {
  getNutritionProfile,
  getTodayLogs,
  getLast30DaysLogs,
  getAllFoods,
  getActiveDietPlan,
} from "@/utils/nutrition";
import ClientNutritionView from "@/components/ui/ClientNutritionView";
import NutritionForm from "@/components/ui/NutritionForm";
import { addFoodLog, removeFoodLog, createCustomFood, saveOwnNutritionProfile } from "./actions";

export default async function ClientNutritionPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const today = new Date().toISOString().split("T")[0];

  const [nutritionProfile, todayLogs, historyLogs, foods, activePlan] =
    await Promise.all([
      getNutritionProfile(user.id),
      getTodayLogs(user.id, today),
      getLast30DaysLogs(user.id),
      getAllFoods(),
      getActiveDietPlan(user.id),
    ]);

  // Free community members set and adjust their own targets — no coach review.
  if (!isSubscribed(profile)) {
    return (
      <div>
        <div className="px-6 pt-8 max-w-2xl mx-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Nutrition — Communauté
          </p>
          <h1 className="text-2xl font-black uppercase tracking-tight mb-1">Mes objectifs</h1>
          <p className="text-sm text-[#F5EDED]/45 mb-4">
            Calcule et ajuste toi-même tes besoins — autonome, sans suivi coach.
          </p>
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
          dietMode={activePlan?.mode ?? "flexible"}
          activePlan={activePlan}
          addFoodLog={addFoodLog}
          removeFoodLog={removeFoodLog}
          createCustomFood={createCustomFood}
        />
      </div>
    );
  }

  return (
    <ClientNutritionView
      today={today}
      nutritionProfile={nutritionProfile}
      initialTodayLogs={todayLogs}
      historyLogs={historyLogs}
      initialFoods={foods}
      dietMode={activePlan?.mode ?? "flexible"}
      activePlan={activePlan}
      addFoodLog={addFoodLog}
      removeFoodLog={removeFoodLog}
      createCustomFood={createCustomFood}
    />
  );
}
