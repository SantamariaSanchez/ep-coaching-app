import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getClientIntake } from "@/utils/client-intake";
import ClientOnboardingIntake from "@/components/onboarding/ClientOnboardingIntake";

export default async function OnboardingIntakePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "coach") redirect("/dashboard/coach");

  // Déjà rempli — on ne repasse pas dessus (le coach peut toujours l'éditer
  // depuis la fiche client s'il faut corriger quelque chose).
  const existing = await getClientIntake(user.id);
  if (existing) redirect("/dashboard/client");

  return <ClientOnboardingIntake />;
}
