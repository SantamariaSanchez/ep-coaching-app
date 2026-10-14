import { getT } from "@/lib/i18n-server";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getStepSettings, getStepRoutineItems, getStepLogs, getStepsSyncStatus } from "@/utils/steps";
import { createAdminClient } from "@/lib/supabase-admin";
import StepsClient from "@/components/steps/StepsClient";
import { addRoutineItem, deleteRoutineItem, logSteps, createReminderFromRoutine, setManualStepsTotal, getTodayStepsLive } from "./actions";

export default async function ClientStepsPage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/steps");

  const admin = createAdminClient();
  const [settings, routineItems, logs, { data: ouraConnection }, syncStatus] = await Promise.all([
    getStepSettings(user.id),
    getStepRoutineItems(user.id),
    getStepLogs(user.id, 35),
    admin.from("oura_connections").select("client_id").eq("client_id", user.id).maybeSingle(),
    getStepsSyncStatus(user.id),
  ]);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">
          {t("Suivi")}
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">{t("Steps")}</h1>
      </div>

      <StepsClient
        settings={settings}
        routineItems={routineItems}
        logs={logs}
        hasOura={!!ouraConnection}
        ouraTrackingHref="/dashboard/client/tracking"
        syncHref="/dashboard/client/steps/synchro"
        syncStatus={syncStatus}
        setManualStepsTotal={setManualStepsTotal}
        getTodayStepsLive={getTodayStepsLive}
        createReminderFromRoutine={createReminderFromRoutine}
        addRoutineItem={addRoutineItem}
        deleteRoutineItem={deleteRoutineItem}
        logSteps={logSteps}
      />
    </div>
  );
}
