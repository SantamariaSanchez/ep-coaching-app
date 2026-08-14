export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getClientPhotoUpdates, getThisWeekPhotoUpdate } from "@/utils/photos";
import ClientPhotosView from "@/components/ui/ClientPhotosView";
import { submitPhotoUpdate } from "./actions";
import { saveCompetitionSettings } from "@/app/dashboard/coach/clients/[id]/photos/actions";
import { todayInParis } from "@/lib/dates";

export default async function CoachMonPhotosPage() {
  const user = await getUser();
  if (!user) redirect("/auth/coach");

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const today = todayInParis();

  let photoHistory: Awaited<ReturnType<typeof getClientPhotoUpdates>> = [];
  let weekUpdate = null;
  try {
    [photoHistory, weekUpdate] = await Promise.all([
      getClientPhotoUpdates(user.id, 20),
      getThisWeekPhotoUpdate(user.id),
    ]);
  } catch (e) {
    console.error("Photos fetch error:", e);
  }

  const alreadySubmitted = !!weekUpdate;

  return (
    <ClientPhotosView
      today={today}
      profile={profile}
      photoHistory={photoHistory}
      alreadySubmitted={alreadySubmitted}
      submitPhotoUpdate={submitPhotoUpdate}
      saveCompetitionSettings={saveCompetitionSettings}
    />
  );
}
