export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getBiometricLogs, getBiometricInsights } from "@/utils/biometrics";
import { getClientDailyLogs } from "@/utils/daily-logs";
import { getSleepSchedule } from "@/lib/daily-gate";
import { isOuraConfigured } from "@/lib/oura";
import TrackingClient from "@/components/tracking/TrackingClient";
import SleepScheduleCard from "@/components/tracking/SleepScheduleCard";
import { logBiometrics, disconnectOura, acknowledgeBiometricInsight, updateSleepSchedule } from "@/app/dashboard/client/tracking/actions";

export default async function CoachMoiTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ oura?: string }>;
}) {
  const { oura: ouraStatus } = await searchParams;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const admin = createAdminClient();
  const [logs, insights, { data: ouraConnection }, recentDailyLogs, sleepSchedule] = await Promise.all([
    getBiometricLogs(user.id),
    getBiometricInsights(user.id),
    admin.from("oura_connections").select("client_id").eq("client_id", user.id).maybeSingle(),
    getClientDailyLogs(user.id, 14),
    getSleepSchedule(user.id),
  ]);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon suivi
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Sommeil</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Sommeil, récupération, HRV : des données qui débouchent sur de vraies suggestions d&apos;ajustement.
        </p>
      </div>

      <SleepScheduleCard
        targetBedtime={sleepSchedule.targetBedtime}
        targetWakeTime={sleepSchedule.targetWakeTime}
        recentLogs={recentDailyLogs}
        updateAction={updateSleepSchedule}
      />

      <TrackingClient
        logs={logs}
        insights={insights}
        logBiometrics={logBiometrics}
        acknowledgeBiometricInsight={acknowledgeBiometricInsight}
        ouraConnected={!!ouraConnection}
        canConnectOura
        ouraConfigured={isOuraConfigured()}
        isCoachView
        disconnectOura={disconnectOura}
        ouraStatus={ouraStatus}
      />
    </div>
  );
}
