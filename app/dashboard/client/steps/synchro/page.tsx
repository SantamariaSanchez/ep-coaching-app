import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { StepsSyncPage } from "@/components/steps/StepsSyncPage";

export default async function ClientStepsSyncPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/steps/synchro");
  return <StepsSyncPage userId={user.id} backHref="/dashboard/client/steps" ouraHref="/dashboard/client/tracking" />;
}
