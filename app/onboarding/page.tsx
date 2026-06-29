import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import OnboardingTour from "@/components/onboarding/OnboardingTour";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "coach") redirect("/dashboard/coach");
  if (profile.onboarding_completed_at) redirect("/dashboard/client");

  return <OnboardingTour />;
}
