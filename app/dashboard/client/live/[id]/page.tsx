import { redirect, notFound } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getLiveEventById } from "@/utils/live-events";
import JitsiRoom from "@/components/live/JitsiRoom";

export default async function ClientLiveRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/live");

  const event = await getLiveEventById(id);
  if (!event || event.status !== "scheduled") notFound();

  // A 1:1 event is only joinable by the invited client.
  if (event.type === "1to1" && event.invited_client_id !== user.id) notFound();

  return <JitsiRoom roomSlug={event.room_slug} title={event.title} backHref="/dashboard/client/live" />;
}
