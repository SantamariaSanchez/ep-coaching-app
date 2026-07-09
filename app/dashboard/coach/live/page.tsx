import { redirect } from "next/navigation";
import { getUser, getProfile, getClients } from "@/utils/auth";
import { getAllLiveEventsForCoach } from "@/utils/live-events";
import LiveEventsList from "@/components/live/LiveEventsList";
import { createLiveEvent, cancelLiveEvent, deleteLiveEvent } from "./actions";

export default async function CoachLivePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/live");

  const [events, clients] = await Promise.all([
    getAllLiveEventsForCoach(),
    getClients(),
  ]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Live
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Lives & appels</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Programme tes appels 1:1, tes webinaires et tes lives Q&amp;A. La salle vidéo est intégrée.
        </p>
      </div>

      <LiveEventsList
        initialEvents={events}
        basePath="/dashboard/coach"
        isCoach={true}
        clients={clients.map((c) => ({ id: c.id, full_name: c.full_name }))}
        onCreate={createLiveEvent}
        onCancel={cancelLiveEvent}
        onDelete={deleteLiveEvent}
      />
    </div>
  );
}
