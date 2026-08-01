import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import RoadmapView from "@/components/client/RoadmapView";

export default async function ClientRoadmapPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  return <RoadmapView />;
}
