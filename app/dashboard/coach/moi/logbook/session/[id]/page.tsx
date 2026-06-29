import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import SessionView from "@/components/client/SessionView";

export default async function CoachSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  return <SessionView sessionId={id} returnPath="/dashboard/coach/moi/logbook" />;
}
