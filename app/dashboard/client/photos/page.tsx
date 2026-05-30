import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import {
  getClientPhotoUpdates,
  getThisWeekPhotoUpdate,
  getTodayPhotoUpdate,
} from "@/utils/photos";
import ClientPhotosView from "@/components/ui/ClientPhotosView";
import { submitPhotoUpdate } from "./actions";

export default async function ClientPhotosPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const frequency = profile?.photo_frequency ?? "weekly";
  const today = new Date().toISOString().split("T")[0];

  const [photoHistory, weekUpdate, dayUpdate] = await Promise.all([
    getClientPhotoUpdates(user.id, 20),
    frequency === "weekly" ? getThisWeekPhotoUpdate(user.id) : Promise.resolve(null),
    frequency === "daily" ? getTodayPhotoUpdate(user.id) : Promise.resolve(null),
  ]);

  const alreadySubmitted = frequency === "weekly" ? !!weekUpdate : !!dayUpdate;

  return (
    <ClientPhotosView
      today={today}
      profile={profile}
      photoHistory={photoHistory}
      alreadySubmitted={alreadySubmitted}
      submitPhotoUpdate={submitPhotoUpdate}
    />
  );
}
