import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "coach") redirect("/dashboard/coach");
  if (profile.onboarding_completed_at) redirect("/dashboard/client");

  return <OnboardingFlow />;
}
