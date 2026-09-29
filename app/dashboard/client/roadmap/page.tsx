import { redirect } from "next/navigation";
import { getUser, getProfile, getAccessType } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { loadRoadmapPageData } from "@/utils/phase-pilot";
import { todayInParis } from "@/lib/dates";
import RoadmapView from "@/components/client/RoadmapView";

export default async function ClientRoadmapPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  // Retombait sur le dashboard générique au lieu de sa propre road map
  // (app/dashboard/coach/moi/roadmap existe déjà) — même trou trouvé sur
  // plusieurs pages client en auditant public/manifest.json.
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/roadmap");

  // Item 37 : dérivation centralisée (utils/auth-client.ts, réexportée par
  // utils/auth.ts) plutôt que de recomposer la condition ici. Audit
  // 2026-09-28 : calculée côté serveur avec la road map et le pilote de
  // phase, au lieu de 3 requêtes navigateur au montage.
  const isFree = getAccessType(profile) === "membre_gratuit";
  const data = await loadRoadmapPageData(await createServerSupabase(), user.id, "self");

  return <RoadmapView userId={user.id} isFree={isFree} today={todayInParis()} data={data} />;
}
