import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { loadRoadmapPageData } from "@/utils/phase-pilot";
import { todayInParis } from "@/lib/dates";
import CoachMoiRoadmapView from "@/components/coach/CoachMoiRoadmapView";

export default async function CoachRoadmapPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");

  // Road map + pilote de phase lus côté serveur avec la session de
  // l'utilisateur (RLS : il ne lit que ses propres suivis). Une erreur de
  // lecture remonte dans data.error, jamais maquillée en "pas de road map".
  const data = await loadRoadmapPageData(await createServerSupabase(), user.id, "self");

  return <CoachMoiRoadmapView userId={user.id} today={todayInParis()} data={data} />;
}
