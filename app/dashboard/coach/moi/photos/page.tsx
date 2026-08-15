export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getPersonalPhotos } from "@/utils/personal-photos";
import PersonalPhotosView from "@/components/ui/PersonalPhotosView";
import { uploadPersonalPhoto, deletePersonalPhoto } from "./personal-actions";

// Masterclass Axe P (2026-08-15) : rendait ClientPhotosView ("envoyer une
// mise à jour" à un coach) pour TOUT compte coach, y compris la fondatrice
// elle-même — qui n'a justement personne au-dessus d'elle pour relire ces
// photos. Même bug que côté client pour les membres gratuits (déjà géré
// par isSubscribed() dans app/dashboard/client/photos/page.tsx) : un coach
// qui suit ses propres photos est structurellement dans la même situation
// qu'un membre libre, donc même vue (upload + comparaison avant/après,
// zéro notion d'envoi à quelqu'un).
export default async function CoachMonPhotosPage() {
  const user = await getUser();
  if (!user) redirect("/auth/coach");

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const photos = await getPersonalPhotos(user.id).catch(() => []);

  return (
    <PersonalPhotosView
      photos={photos}
      uploadPersonalPhoto={uploadPersonalPhoto}
      deletePersonalPhoto={deletePersonalPhoto}
    />
  );
}
