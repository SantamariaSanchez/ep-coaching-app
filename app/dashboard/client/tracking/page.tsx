import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { SleepPage } from "@/lib/sleep-page";

export default async function ClientTrackingPage({ searchParams }: { searchParams: Promise<{ oura?: string }> }) {
  const { oura } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/tracking");
  return <SleepPage userId={user.id} canConnectOura={isSubscribed(profile)} ouraStatus={oura} />;
}
