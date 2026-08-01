import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed, isClientCapable } from "@/utils/auth";
import { getAvailableSlotsForCoach } from "@/utils/live-events";
import SlotPicker from "@/components/client/SlotPicker";
import BackButton from "@/components/ui/BackButton";

export default async function BookLiveSlotPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!isClientCapable(profile)) redirect("/dashboard/coach");
  if (profile?.role !== "coach" && !isSubscribed(profile)) redirect("/dashboard/client/abonnement");

  const coachId = profile?.coach_id ?? null;
  if (!coachId) redirect("/dashboard/client/live");

  const slots = await getAvailableSlotsForCoach(coachId);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <BackButton fallbackHref="/dashboard/client/live" />
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Live
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Réserver un 1:1</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Choisis un créneau libre dans les disponibilités de ton coach.
        </p>
      </div>

      <SlotPicker coachId={coachId} slots={slots} />
    </div>
  );
}
