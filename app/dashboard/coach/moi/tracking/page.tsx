export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getBiometricLogs, getBiometricInsights } from "@/utils/biometrics";
import TrackingClient from "@/components/tracking/TrackingClient";
import { logBiometrics, disconnectOura } from "@/app/dashboard/client/tracking/actions";

export default async function CoachMoiTrackingPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

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
          Mon suivi
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Sommeil</h1>
      </div>

      <TrackingClient
        logs={logs}
        insights={insights}
        logBiometrics={logBiometrics}
        ouraConnected={!!ouraConnection}
        canConnectOura
        disconnectOura={disconnectOura}
      />
    </div>
  );
}
