import { getT } from "@/lib/i18n-server";
import BackButton from "@/components/ui/BackButton";
﻿import { redirect, notFound } from "next/navigation";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getAllClientPhotoUpdates } from "@/utils/photos";
import { saveCompetitionSettings, sendPhotoFeedback } from "./actions";
import CoachClientPhotosView from "@/components/ui/CoachClientPhotosView";
import { getClientCheckinPhotos } from "@/utils/checkins";
import { mergePhotoSets, photoUpdateSets, setsFromCheckins } from "@/lib/photo-sets";

export default async function CoachClientPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getT();
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client] = await Promise.all([
    getProfile(user.id),
    getClientById(id, user.id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  const [photos, checkinPhotos] = await Promise.all([getAllClientPhotoUpdates(id), getClientCheckinPhotos(id)]);
  const compareSets = mergePhotoSets(setsFromCheckins(checkinPhotos), photoUpdateSets(photos));

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto page-transition">
      {/* Retour réel vers la fiche (même onglet), sinon la fiche sur l'onglet photos. */}
      <BackButton
        fallbackHref={`/dashboard/coach/clients/${id}?tab=photos`}
        expect={`/dashboard/coach/clients/${id}`}
        label={client.full_name ?? t("Client")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-ink)/70 transition-colors mb-6"
      />

      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">
          {t("Photos")}
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          {client.full_name}
        </h1>
      </div>

      <CoachClientPhotosView
        client={client}
        photos={photos}
        saveCompetitionSettings={saveCompetitionSettings}
        sendPhotoFeedback={sendPhotoFeedback}
        compareSets={compareSets}
      />
    </div>
  );
}
