import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getAccessType } from "@/utils/auth-client";
import { getActiveProgram } from "@/utils/programs";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "coach") redirect("/dashboard/coach");
  if (profile.onboarding_completed_at) redirect("/dashboard/client");

  // Programme de départ proposé dans le tour seulement à un membre gratuit
  // qui n'a encore aucun programme (voir installStarterProgram).
  const canInstallStarter =
    getAccessType(profile) === "membre_gratuit" &&
    !((await getActiveProgram(user.id))?.days.length);

  return <OnboardingFlow canInstallStarter={canInstallStarter} />;
}
