import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import AnalyticsClient from "@/components/coach/AnalyticsClient";

export default async function AnalyticsPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  return <AnalyticsClient />;
}
