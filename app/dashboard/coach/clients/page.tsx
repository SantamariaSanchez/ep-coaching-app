import { redirect } from "next/navigation";
import { getUser, getProfile, getClients, isSubscribed } from "@/utils/auth";
import { getPointsMap } from "@/lib/gamification";
import { isEligibleForLegendReward } from "@/lib/gamification-types";
import { getCoachingPhaseOverview } from "@/lib/coaching-phase";
import ClientsSection from "@/components/ui/ClientsSection";

export default async function ClientsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const [profile, clients] = await Promise.all([
    getProfile(user.id),
    getClients(user.id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");

  const clientIds = clients.map((c) => c.id);
  const [pointsMap, phaseOverview] = await Promise.all([
    getPointsMap(clientIds),
    // Coach exclusivement — repère qui décroche ou est prêt à changer de
    // phase sans avoir à ouvrir chaque fiche (voir ClientCard alerts).
    getCoachingPhaseOverview(clientIds),
  ]);
  const ouraEligibleIds = clients
    .filter((c) => isEligibleForLegendReward(pointsMap[c.id] ?? 0, isSubscribed(c)))
    .map((c) => c.id);

  return (
    <div className="page-transition ep-page-wide" style={{ padding: "32px 24px 48px" }}>
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Gestion</p>
        <h1 className="ep-h1">Mes clients</h1>
        <p style={{ marginTop: 6, fontSize: 12, color: "rgba(245,237,237,0.3)", fontWeight: 500 }}>
          {clients.length} client{clients.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      <ClientsSection clients={clients} ouraEligibleIds={ouraEligibleIds} phaseOverview={phaseOverview} />
    </div>
  );
}
