import { redirect } from "next/navigation";
import { getUser, getProfile, getActiveCoachesForDiscovery } from "@/utils/auth";
import CoachDiscoveryList from "@/components/client/CoachDiscoveryList";

export default async function ClientCoachsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.coach_id) redirect("/dashboard/client");

  const coaches = await getActiveCoachesForDiscovery();

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 480, margin: "0 auto" }}>
      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Coaching</p>
        <h1 className="ep-h1">Choisis ton coach</h1>
        <p style={{ marginTop: 8, fontSize: 13, color: "rgba(245,237,237,0.45)", lineHeight: 1.6 }}>
          Voici les coachs actifs sur la plateforme. Tu peux aussi contacter Santamaria directement
          sur Instagram si tu préfères qu&apos;il te suive personnellement.
        </p>
      </div>

      <CoachDiscoveryList coaches={coaches} />
    </div>
  );
}
