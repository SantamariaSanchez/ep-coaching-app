import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import RoadmapView from "@/components/client/RoadmapView";

export default async function ClientRoadmapPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  // Retombait sur le dashboard générique au lieu de sa propre road map
  // (app/dashboard/coach/moi/roadmap existe déjà) — même trou trouvé sur
  // plusieurs pages client en auditant public/manifest.json.
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/roadmap");

  return <RoadmapView />;
}
