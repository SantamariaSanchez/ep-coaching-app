import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import SessionView from "@/components/client/SessionView";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  // Préserve l'id de séance (app/dashboard/coach/moi/logbook/session/[id]
  // existe) plutôt que de retomber sur le dashboard générique — même trou
  // trouvé sur plusieurs pages client en auditant public/manifest.json.
  if (profile?.role === "coach") redirect(`/dashboard/coach/moi/logbook/session/${id}`);

  return <SessionView sessionId={id} />;
}
