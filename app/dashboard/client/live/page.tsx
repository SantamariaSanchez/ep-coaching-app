import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getUpcomingLiveEventsForClient, getPastLiveEventsForClient } from "@/utils/live-events";
import LiveEventsList from "@/components/live/LiveEventsList";

export default async function ClientLivePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/live");

  // Les lives passés étaient invisibles côté client — seuls les "à venir"
  // (status="scheduled") étaient chargés, la section "Passés" de
  // LiveEventsList ne recevait donc jamais rien à afficher.
  const [upcoming, past] = await Promise.all([
    getUpcomingLiveEventsForClient(user.id),
    getPastLiveEventsForClient(user.id),
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
      </div>

      <LiveEventsList initialEvents={events} basePath="/dashboard/client" isCoach={false} />
    </div>
  );
}
