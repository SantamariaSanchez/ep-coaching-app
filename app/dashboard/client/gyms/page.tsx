import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getGymsWithReviews } from "@/utils/gyms";
import GymsDirectoryView from "@/components/ui/GymsDirectoryView";
import { createGym, updateGym, deleteGym, upsertGymReview, deleteGymReview } from "./actions";
import { MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientGymsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/gyms");

  const gyms = await getGymsWithReviews();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
          Training
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <MapPin size={26} className="text-[var(--color-ep-red)]" strokeWidth={1.8} />
          Salles de musculation
        </h1>
      </div>

      <GymsDirectoryView
        gyms={gyms}
        isCoach={false}
        currentUserId={user.id}
        createGym={createGym}
        updateGym={updateGym}
        deleteGym={deleteGym}
        upsertGymReview={upsertGymReview}
        deleteGymReview={deleteGymReview}
      />
    </div>
  );
}
