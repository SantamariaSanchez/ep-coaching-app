import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { SleepPage } from "@/lib/sleep-page";

export const dynamic = "force-dynamic";

export default async function CoachMoiTrackingPage({ searchParams }: { searchParams: Promise<{ oura?: string }> }) {
  const { oura } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/auth/coach");
  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");
  return <SleepPage userId={user.id} canConnectOura ouraStatus={oura} isCoachView />;
}
