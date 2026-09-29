import { redirect, notFound } from "next/navigation";
import { getUser, getProfile, isSubscribed, isClientCapable } from "@/utils/auth";
import { getLiveEventById } from "@/utils/live-events";
import { isWithinJoinWindow, isOneToOneType, LIVE_TYPE_LABELS } from "@/lib/live-types";
import LiveRoomLobby from "@/components/live/LiveRoomLobby";

export default async function ClientLiveRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!isClientCapable(profile)) redirect("/dashboard/coach");
  // Réservé aux clients payants — sans ce contrôle, un membre gratuit qui
  // connaît/devine l'URL de la salle pouvait rejoindre le live directement,
  // même si la liste ne le lui montrait pas. Exception double rôle : voir
  // page.tsx du même dossier.
  if (profile?.role !== "coach" && !isSubscribed(profile)) redirect("/dashboard/client/abonnement");

  const event = await getLiveEventById(id);
  if (!event || event.status !== "scheduled") notFound();

  // Un événement en tête-à-tête n'est joignable que par le client invité.
  if (isOneToOneType(event.type) && event.invited_client_id !== user.id) notFound();
  // Un événement de groupe (webinaire/qna/atelier) n'est joignable que par les clients de son propre coach.
  if (!isOneToOneType(event.type) && event.host_id !== profile?.coach_id) notFound();

  // La carte du live n'affiche "Rejoindre" que dans la fenêtre autorisée —
  // sans ce contrôle, l'URL de la salle restait joignable à tout moment
  // pour qui la connaît (lien partagé, favori, retour en arrière...).
  if (!isWithinJoinWindow(event)) redirect("/dashboard/client/live");

  // Salle d'attente avec lien vers la visio plutôt qu'une visio embarquée :
  // meet.jit.si coupe toute réunion embarquée au bout de 5 minutes (voir
  // components/live/LiveRoomLobby.tsx).
  return (
    <LiveRoomLobby
      eventId={event.id}
      roomSlug={event.room_slug}
      title={event.title}
      typeLabel={LIVE_TYPE_LABELS[event.type]}
      startsAt={event.starts_at}
      durationMinutes={event.duration_minutes}
      backHref="/dashboard/client/live"
      displayName={profile?.full_name?.split(" ")[0] ?? null}
    />
  );
}
