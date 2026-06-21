export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getNutritionProfile, getTodayLogs, getLast30DaysLogs, getAllFoods, getActiveDietPlan } from "@/utils/nutrition";
import ClientNutritionView from "@/components/ui/ClientNutritionView";
import { addFoodLog, removeFoodLog, createCustomFood } from "@/app/dashboard/client/nutrition/actions";

export default async function CoachMonNutritionPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const today = new Date().toISOString().split("T")[0];

  const [nutritionProfile, todayLogs, historyLogs, foods, activePlan] = await Promise.all([
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
      activePlan={activePlan}
      addFoodLog={addFoodLog}
      removeFoodLog={removeFoodLog}
      createCustomFood={createCustomFood}
    />
  );
}
