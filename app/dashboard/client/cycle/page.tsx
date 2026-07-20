export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getClientIntake } from "@/utils/client-intake";
import { getPeriodLogs, computeCycleStats } from "@/utils/period-tracking";
import ClientPeriodTracking from "@/components/ui/ClientPeriodTracking";
import { addPeriodLog, deletePeriodLog } from "./actions";

export default async function ClientCyclePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/client");

  const intake = await getClientIntake(user.id);
  // Onglet réservé au suivi du cycle menstruel — pas de sens pour un client
  // dont la fiche indique un autre genre, ou pas encore de fiche du tout.
  if (intake?.gender !== "Femme") redirect("/dashboard/client");

  const logs = await getPeriodLogs(user.id);
  const stats = computeCycleStats(logs);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px 80px" }}>
      <div style={{ marginBottom: 24, paddingTop: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: "#F5EDED", margin: 0 }}>
          Mon cycle
        </h1>
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: "4px 0 0", fontWeight: 600 }}>
          Suivi de tes cycles menstruels
        </p>
      </div>

      <ClientPeriodTracking
        clientId={user.id}
        logs={logs}
        stats={stats}
        addPeriodLog={addPeriodLog}
        deletePeriodLog={deletePeriodLog}
      />
    </div>
  );
}
