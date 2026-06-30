export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getStepSettings, getStepRoutineItems, getStepLogs } from "@/utils/steps";
import StepsClient from "@/components/steps/StepsClient";
import { updateStepGoal, addRoutineItem, deleteRoutineItem, logSteps } from "@/app/dashboard/client/steps/actions";

export default async function CoachMoiStepsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const [settings, routineItems, logs] = await Promise.all([
    getStepSettings(user.id),
    getStepRoutineItems(user.id),
    getStepLogs(user.id),
  ]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
          Mon suivi
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Pas & routine</h1>
      </div>

      <StepsClient
        settings={settings}
        routineItems={routineItems}
        logs={logs}
        updateStepGoal={updateStepGoal}
        addRoutineItem={addRoutineItem}
        deleteRoutineItem={deleteRoutineItem}
        logSteps={logSteps}
      />
    </div>
  );
}
