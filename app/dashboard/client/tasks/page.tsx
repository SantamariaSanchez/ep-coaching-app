import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import ClientTasksView from "@/components/client/ClientTasksView";

export default async function ClientTasksPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  return <ClientTasksView />;
}
