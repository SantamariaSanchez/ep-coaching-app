import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { getUser, getProfile, isSubscribed, isClientCapable } from "@/utils/auth";
import { getUpcomingLiveEventsForClient, getPastLiveEventsForClient } from "@/utils/live-events";
import LiveEventsList from "@/components/live/LiveEventsList";
import FlashRequestButton from "@/components/client/FlashRequestButton";
import { toggleRsvp } from "./actions";

export default async function ClientLivePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!isClientCapable(profile)) redirect("/dashboard/coach");
  // Réservé aux clients payants (voir proxy.ts) — vérification explicite en
  // plus du middleware, les lives étant un canal direct vers le coach. Un
  // coach lui-même suivi par un autre coach (double rôle) n'est jamais
  // soumis à ce paywall entre professionnels (voir Lot 1).
  if (profile?.role !== "coach" && !isSubscribed(profile)) redirect("/dashboard/client/abonnement");

  // Les lives passés étaient invisibles côté client — seuls les "à venir"
  // (status="scheduled") étaient chargés, la section "Passés" de
  // LiveEventsList ne recevait donc jamais rien à afficher.
  const [upcoming, past] = await Promise.all([
    getUpcomingLiveEventsForClient(user.id, profile?.coach_id ?? null),
    getPastLiveEventsForClient(user.id, profile?.coach_id ?? null),
  ]);
  const events = [...upcoming, ...past];

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Live
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Lives & appels</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Appels 1:1 avec ton coach, webinaires et lives Q&amp;A, directement dans l&apos;appli.
        </p>
        <Link
          href="/dashboard/client/live/reserver"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#E01E1E] mt-2"
        >
          <CalendarPlus size={13} />
          Réserver un appel 1:1
        </Link>
        <FlashRequestButton />
      </div>

      <LiveEventsList
        initialEvents={events}
        basePath="/dashboard/client"
        isCoach={false}
        onToggleRsvp={toggleRsvp}
      />
    </div>
  );
}
