import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getBiometricLogs, getBiometricInsights } from "@/utils/biometrics";
import { createAdminClient } from "@/lib/supabase-admin";
import TrackingClient from "@/components/tracking/TrackingClient";
import { logBiometrics, disconnectOura } from "./actions";

export default async function ClientTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ oura?: string }>;
}) {
  const { oura: ouraStatus } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/tracking");

  const admin = createAdminClient();
  const [logs, insights, { data: ouraConnection }] = await Promise.all([
    getBiometricLogs(user.id),
    getBiometricInsights(user.id),
    admin.from("oura_connections").select("client_id").eq("client_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Suivi
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Sommeil</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Sommeil, récupération, HRV : des données qui débouchent sur de vraies suggestions d&apos;ajustement.
        </p>
      </div>

      <TrackingClient
        logs={logs}
        insights={insights}
        logBiometrics={logBiometrics}
        ouraConnected={!!ouraConnection}
        canConnectOura={isSubscribed(profile)}
        disconnectOura={disconnectOura}
        ouraStatus={ouraStatus}
      />
    </div>
  );
}
