import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getGymsWithReviews } from "@/utils/gyms";
import GymsDirectoryView from "@/components/ui/GymsDirectoryView";
import SeedLibraryButton from "@/components/ui/SeedLibraryButton";
import {
  createGym,
  updateGym,
  deleteGym,
  upsertGymReview,
  deleteGymReview,
  seedOfficialGyms,
} from "@/app/dashboard/client/gyms/actions";
import { MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoachGymsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/gyms");

  const gyms = await getGymsWithReviews();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Training
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3 mb-3">
          <MapPin size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          Salles de musculation
        </h1>
        <SeedLibraryButton label="Importer les enseignes officielles" action={seedOfficialGyms} />
      </div>

      <GymsDirectoryView
        gyms={gyms}
        isCoach
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
