import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import RemindersView from "@/components/client/RemindersView";

export default async function RemindersPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  return <RemindersView />;
}
