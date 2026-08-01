import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import CoachMoiRoadmapView from "@/components/coach/CoachMoiRoadmapView";

export default async function CoachRoadmapPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");

  return <CoachMoiRoadmapView userId={user.id} />;
}
