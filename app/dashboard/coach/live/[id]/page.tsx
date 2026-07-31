import { redirect, notFound } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getLiveEventById } from "@/utils/live-events";
import JitsiRoom from "@/components/live/JitsiRoom";
import { endLiveEvent } from "../actions";

export default async function CoachLiveRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/live");

  const event = await getLiveEventById(id);
  if (!event || event.status !== "scheduled") notFound();
  // Un coach ne peut héberger que ses propres lives, jamais ceux d'un autre coach.
  if (event.host_id !== profile?.id) notFound();

  return (
    <JitsiRoom
      roomSlug={event.room_slug}
      title={event.title}
      backHref="/dashboard/coach/live"
      isHost
      onEndLive={endLiveEvent.bind(null, id)}
    />
  );
}
