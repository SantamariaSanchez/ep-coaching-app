import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import {
  getNutritionProfile,
  getTodayLogs,
  getLast30DaysLogs,
  getAllFoods,
  getActiveDietPlan,
} from "@/utils/nutrition";
import ClientNutritionView from "@/components/ui/ClientNutritionView";
import { addFoodLog, removeFoodLog, createCustomFood } from "./actions";

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

  return (
    <ClientNutritionView
      today={today}
      nutritionProfile={nutritionProfile}
      initialTodayLogs={todayLogs}
      historyLogs={historyLogs}
      initialFoods={foods}
      dietMode={activePlan?.mode ?? "flexible"}
      addFoodLog={addFoodLog}
      removeFoodLog={removeFoodLog}
      createCustomFood={createCustomFood}
    />
  );
}
