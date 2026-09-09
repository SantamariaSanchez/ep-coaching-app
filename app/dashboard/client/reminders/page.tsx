import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import RemindersView from "@/components/client/RemindersView";

export default async function RemindersPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  // Retombait sur le dashboard générique au lieu de ses propres rappels
  // (app/dashboard/coach/moi/reminders existe désormais) — même trou trouvé
  // sur plusieurs pages client en auditant public/manifest.json.
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/reminders");

  return <RemindersView />;
}
