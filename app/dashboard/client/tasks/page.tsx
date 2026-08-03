import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import ClientTasksView from "@/components/client/ClientTasksView";
import CoachOnlyGate from "@/components/ui/CoachOnlyGate";
import { ListChecks } from "lucide-react";

export default async function ClientTasksPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");
  // Taches assignees par le coach, lecture seule cote client — sans coach il
  // n'y a jamais rien a afficher (voir CoachOnlyGate).
  if (!isSubscribed(profile)) return <CoachOnlyGate icon={ListChecks} title="Mes tâches" />;

  return <ClientTasksView />;
}
