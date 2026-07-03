import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";

export default async function RoadmapLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  const isCoach = profile?.role === "coach";
  const isPaying = profile?.subscription_status === "active";
  if (!isCoach && !isPaying) {
    redirect("/dashboard/client");
  }

  return <>{children}</>;
}
