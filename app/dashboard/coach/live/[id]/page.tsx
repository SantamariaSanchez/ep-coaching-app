import { redirect, notFound } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getLiveEventById } from "@/utils/live-events";
import { LIVE_TYPE_LABELS } from "@/lib/live-types";
import LiveRoomLobby from "@/components/live/LiveRoomLobby";
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

  // Salle d'attente avec lien vers la visio plutôt qu'une visio embarquée :
  // meet.jit.si coupe toute réunion embarquée au bout de 5 minutes (voir
  // components/live/LiveRoomLobby.tsx). "Terminer le live" y renvoie vers
  // /dashboard/coach/live?recap=<id>, notes du live ouvertes.
  return (
    <LiveRoomLobby
      eventId={event.id}
      roomSlug={event.room_slug}
      title={event.title}
      typeLabel={LIVE_TYPE_LABELS[event.type]}
      startsAt={event.starts_at}
      durationMinutes={event.duration_minutes}
      backHref="/dashboard/coach/live"
      displayName={profile?.full_name?.split(" ")[0] ?? null}
      isHost
      onEndLive={endLiveEvent.bind(null, id)}
    />
  );
}
