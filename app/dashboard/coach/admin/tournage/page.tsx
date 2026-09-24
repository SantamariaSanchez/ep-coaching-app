import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getFounderVideoScripts, groupByFormation } from "@/lib/founder-video-scripts";
import TournageWorkspace from "@/components/coach/TournageWorkspace";

// Réservé au propriétaire de la plateforme — espace personnel de production
// vidéo (scripts mot pour mot, statut de tournage, lien YouTube), jamais
// visible d'un coach tiers, d'un membre ou d'un client. Sans rapport avec
// /dashboard/coach/formations (catalogue "Académie EP" payant).
export default async function TournagePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const videos = await getFounderVideoScripts();
  const formations = groupByFormation(videos);

  return <TournageWorkspace formations={formations} />;
}
