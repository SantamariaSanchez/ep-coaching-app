import { redirect } from "next/navigation";
import { getUser, getProfile, getAllCoaches } from "@/utils/auth";
import CoachStatusToggle from "@/components/coach/CoachStatusToggle";

// Réservé au propriétaire de la plateforme — gère l'accès des coachs tiers
// tant que le Payment Link Stripe de l'abonnement plateforme n'est pas
// branché (voir lib/coach-platform-plan.ts).
export default async function CoachAdminPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const coaches = await getAllCoaches();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Administration
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Coachs</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Coachs tiers inscrits sur la plateforme. Chacun ne voit que ses
          propres clients. Active leur abonnement une fois le paiement confirmé
          (manuellement tant que le Payment Link Stripe n&apos;est pas configuré).
        </p>
      </div>

      {coaches.length === 0 ? (
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.4)" }}>Aucun coach tiers inscrit pour l&apos;instant.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {coaches.map((coach) => (
            <div
              key={coach.id}
              className="ep-card"
              style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>
                  {coach.full_name ?? "Sans nom"}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.4)" }}>{coach.email}</p>
              </div>
              <CoachStatusToggle coachId={coach.id} status={coach.platform_subscription_status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
