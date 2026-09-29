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
import { uploadPersonalPhoto, deletePersonalPhoto, logClientMeasurement } from "./personal-actions";
import { getClientMeasurements } from "@/utils/measurements";
import { getAppSetup } from "@/lib/app-setup-server";
import { isOn } from "@/lib/app-setup";
import MeasurementsSection from "@/components/ui/MeasurementsSection";

export default async function ClientPhotosPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  // Retombait sur le dashboard générique au lieu de ses propres photos
  // (app/dashboard/coach/moi/photos existe déjà) — même trou trouvé sur
  // plusieurs pages client en auditant public/manifest.json.
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/photos");

  // Membres gratuits : pas de coach pour relire ces photos, pas de catégorie
  // de compétition, pas de raison de passer par un lien Drive externe — un
  // simple suivi perso avec upload direct suffit largement.
  // Mensurations et masse grasse (2026-09-29) : saisissables par tout le
  // monde, affichées selon "Mon appli" (masquées si ni mensurations ni
  // masse grasse ne sont suivies).
  const [measurements, appSetup] = await Promise.all([getClientMeasurements(user.id), getAppSetup(user.id)]);
  const showCircumferences = isOn(appSetup, "mensurations");
  const showBodyFat = isOn(appSetup, "masse_grasse");
  const showMeasures = showCircumferences || showBodyFat;

  if (!isSubscribed(profile)) {
    const photos = await getPersonalPhotos(user.id).catch(() => []);
    return (
      <PersonalPhotosView
        photos={photos}
        uploadPersonalPhoto={uploadPersonalPhoto}
        deletePersonalPhoto={deletePersonalPhoto}
        measurements={measurements}
        logMeasurement={showMeasures ? logClientMeasurement : undefined}
        showCircumferences={showCircumferences}
        showBodyFat={showBodyFat}
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
    <>
    <ClientPhotosView
      today={today}
      profile={profile}
      photoHistory={photoHistory}
      alreadySubmitted={alreadySubmitted}
      submitPhotoUpdate={submitPhotoUpdate}
    />
    {showMeasures && (
      <div className="px-6 max-w-2xl mx-auto pb-24 md:pb-8">
        <MeasurementsSection measurements={measurements} logMeasurement={logClientMeasurement} showCircumferences={showCircumferences} showBodyFat={showBodyFat} />
      </div>
    )}
    </>
  );
}
