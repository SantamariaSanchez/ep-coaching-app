import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { todayInParis } from "@/lib/dates";
import {
  getClientPhotoUpdates,
  getThisWeekPhotoUpdate,
  getTodayPhotoUpdate,
} from "@/utils/photos";
import { getPersonalPhotos } from "@/utils/personal-photos";
import ClientPhotosView from "@/components/ui/ClientPhotosView";
import PersonalPhotosView from "@/components/ui/PersonalPhotosView";
import { submitPhotoUpdate } from "./actions";
import { uploadPersonalPhoto, deletePersonalPhoto } from "./personal-actions";

export default async function ClientPhotosPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  // Membres gratuits : pas de coach pour relire ces photos, pas de catégorie
  // de compétition, pas de raison de passer par un lien Drive externe — un
  // simple suivi perso avec upload direct suffit largement.
  if (!isSubscribed(profile)) {
    const photos = await getPersonalPhotos(user.id).catch(() => []);
    return (
      <PersonalPhotosView
        photos={photos}
        uploadPersonalPhoto={uploadPersonalPhoto}
        deletePersonalPhoto={deletePersonalPhoto}
      />
    );
  }

  const frequency = profile?.photo_frequency ?? "weekly";
  const today = todayInParis();

  // Wrap in try/catch — table might not exist yet in Supabase
  let photoHistory: Awaited<ReturnType<typeof getClientPhotoUpdates>> = [];
  let weekUpdate = null;
  let dayUpdate = null;
  try {
    [photoHistory, weekUpdate, dayUpdate] = await Promise.all([
      getClientPhotoUpdates(user.id, 20),
      frequency === "weekly" ? getThisWeekPhotoUpdate(user.id) : Promise.resolve(null),
      frequency === "daily" ? getTodayPhotoUpdate(user.id) : Promise.resolve(null),
    ]);
  } catch (e) {
    console.error("Photos fetch error:", e);
    // Render page with empty state — table may not exist yet
  }

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
