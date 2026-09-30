import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getAppSetup } from "@/lib/app-setup-server";
import { hiddenSegments } from "@/lib/app-setup";
import PlusMenu from "@/components/ui/PlusMenu";

// Onglet « Plus » du téléphone : tout ce qui n'a pas son propre onglet.
export default async function PlusPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client/plus");
  const setup = await getAppSetup(user.id);
  return (
    <PlusMenu
      space="coach"
      hidden={[...hiddenSegments(setup, "coach")]}
      isFounder={profile?.is_platform_owner === true}
      isFreeTier={!isSubscribed(profile)}
    />
  );
}
