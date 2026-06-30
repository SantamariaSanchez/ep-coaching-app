import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getStepSettings, getStepRoutineItems, getStepLogs } from "@/utils/steps";
import StepsClient from "@/components/steps/StepsClient";
import { updateStepGoal, addRoutineItem, deleteRoutineItem, logSteps } from "./actions";

export default async function ClientStepsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/steps");

  const [settings, routineItems, logs] = await Promise.all([
    getStepSettings(user.id),
    getStepRoutineItems(user.id),
    getStepLogs(user.id),
  ]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Suivi
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Pas & routine</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Fixe ton objectif, planifie des créneaux de marche dans ta journée, et suis ta progression.
        </p>
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
