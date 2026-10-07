import { getT } from "@/lib/i18n-server";
import { INSTAGRAM_URL } from "@/lib/brand-links";
import { redirect } from "next/navigation";
import { getUser, getProfile, getActiveCoachesForDiscovery } from "@/utils/auth";
import CoachDiscoveryList from "@/components/client/CoachDiscoveryList";

export default async function ClientCoachsPage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");

  // coaches est un contenu partagé, indépendant de profile : lancé en
  // parallèle plutôt qu'après la vérification "a déjà un coach".
  const [profile, coaches] = await Promise.all([getProfile(user.id), getActiveCoachesForDiscovery()]);
  if (profile?.coach_id) redirect("/dashboard/client");

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 480, margin: "0 auto" }}>
      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>{t("Coaching")}</p>
        <h1 className="ep-h1">{t("Choisis ton coach")}</h1>
        <p style={{ marginTop: 8, fontSize: 13, color: "rgba(245,237,237,0.45)", lineHeight: 1.6 }}>
          {t("Voici les coachs actifs sur la plateforme. Tu peux aussi contacter Santamaria directement sur Instagram si tu préfères qu'il te suive personnellement.")}
        </p>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ep-btn-primary"
          style={{ display: "inline-flex", marginTop: 12, textDecoration: "none", fontSize: 10.5, padding: "10px 16px" }}
        >
          {t("Contacter Santamaria sur Instagram")}
        </a>
      </div>

      <CoachDiscoveryList coaches={coaches} />
    </div>
  );
}
