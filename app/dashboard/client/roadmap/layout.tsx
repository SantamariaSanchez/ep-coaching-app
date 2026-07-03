import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";

export default async function RoadmapLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach" && profile?.subscription_status !== "active") {
    redirect("/dashboard/client");
  }

  return <>{children}</>;
}
