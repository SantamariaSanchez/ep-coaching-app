import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getPendingBilans, getDoneBilans } from "@/utils/checkins";
import {
  getPendingCorrectionsWithClient,
  getDoneCorrectionsWithClient,
} from "@/utils/corrections";
import { getPendingPhotoUpdates } from "@/utils/photos";
import CoachBilanView from "@/components/ui/CoachBilanView";

export default async function CoachBilanPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const [pendingBilans, pendingCorrections, doneBilans, doneCorrections, pendingPhotos] =
    await Promise.all([
      getPendingBilans(),
      getPendingCorrectionsWithClient(),
      getDoneBilans(),
      getDoneCorrectionsWithClient(),
      getPendingPhotoUpdates(),
    ]);

  const totalPending = pendingBilans.length + pendingCorrections.length + pendingPhotos.length;

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto page-transition">
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Suivi clients
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Bilan
          </h1>
          {totalPending > 0 && (
            <span className="text-sm font-black px-2.5 py-0.5 rounded-full bg-[#E01E1E] text-white">
              {totalPending}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[#F5EDED]/30">
          Check-ins sans bilan + corrections sans réponse.
        </p>
      </div>

      <CoachBilanView
        pendingBilans={pendingBilans}
        pendingCorrections={pendingCorrections}
        doneBilans={doneBilans}
        doneCorrections={doneCorrections}
        pendingPhotos={pendingPhotos}
      />
    </div>
  );
}
