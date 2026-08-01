import { redirect, notFound } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { requireOwnClient } from "@/lib/auth-guards";
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

  return <CoachClientRoadmapView clientId={id} />;
}
