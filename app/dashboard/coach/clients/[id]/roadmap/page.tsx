import { redirect, notFound } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { requireOwnClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { loadRoadmapPageData } from "@/utils/phase-pilot";
import { todayInParis } from "@/lib/dates";
import CoachClientRoadmapView from "@/components/coach/CoachClientRoadmapView";

export default async function CoachRoadmapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const guard = await requireOwnClient(id);
  if (!guard.ok) notFound();

  // Client admin UNIQUEMENT après requireOwnClient : le coach ne lit que la
  // road map et les suivis d'un client qui lui est rattaché.
  const data = await loadRoadmapPageData(createAdminClient(), id, "coach");

  return <CoachClientRoadmapView clientId={id} today={todayInParis()} data={data} />;
}
