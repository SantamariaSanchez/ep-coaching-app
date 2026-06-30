export const dynamic = "force-dynamic"; // Always fetch fresh bilan data
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
    <div className="page-transition" style={{ padding: "32px 24px 48px", maxWidth: 760, margin: "0 auto" }}>
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Suivi clients</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{
            fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em",
            color: "#F5EDED", margin: 0, lineHeight: 1.05,
          }}>
            Bilan
          </h1>
          {totalPending > 0 && (
            <span className="animate-pulse-glow" style={{
              background: "#E01E1E",
              color: "#fff",
              borderRadius: 20,
              padding: "3px 12px",
              fontSize: 13,
              fontWeight: 800,
            }}>
              {totalPending}
            </span>
          )}
        </div>
        <p style={{ marginTop: 6, fontSize: 12, color: "rgba(245,237,237,0.3)", fontWeight: 500 }}>
          Check-ins sans bilan · corrections sans réponse
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
