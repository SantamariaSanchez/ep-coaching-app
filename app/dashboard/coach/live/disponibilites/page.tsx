import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getMyAvailabilityRules } from "../actions";
import AvailabilityManager from "@/components/coach/AvailabilityManager";
import BackButton from "@/components/ui/BackButton";

export default async function CoachAvailabilityPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/live");

  const rules = await getMyAvailabilityRules();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <BackButton fallbackHref="/dashboard/coach/live" />
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Live
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mes disponibilités</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Définis tes créneaux récurrents : tes clients réservent directement un appel 1:1 dans un
          créneau libre, sans que tu aies à le programmer toi-même.
        </p>
      </div>

      <AvailabilityManager initialRules={rules} />
    </div>
  );
}
