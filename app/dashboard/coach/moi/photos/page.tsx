export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getPersonalPhotos } from "@/utils/personal-photos";
import { getClientMeasurements } from "@/utils/measurements";
import PersonalPhotosView from "@/components/ui/PersonalPhotosView";
import { uploadPersonalPhoto, deletePersonalPhoto, logPersonalMeasurement } from "./personal-actions";
import { createAdminClient } from "@/lib/supabase-admin";

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

  const [photos, competitionRow, measurements] = await Promise.all([
    getPersonalPhotos(user.id).catch(() => []),
    // Nouveau (retour direct 2026-09-09, "moi" — "prends et fais ce que tu
    // veux") : competition_category/competition_date sont déjà remplis via
    // Ma Road Map (compétition WNBF), mais n'étaient exploités que sur
    // ClientPhotosView (jamais rendue pour un coach — voir commentaire plus
    // bas) — PersonalPhotosView n'affichait donc jamais le compte à rebours
    // ni le guide de posing correspondant. Lecture ciblée (pas dans
    // PROFILE_FIELDS), même convention que website/accepting_new_clients.
    createAdminClient()
      .from("profiles")
      .select("competition_category, competition_date")
      .eq("id", user.id)
      .maybeSingle(),
    // Nouveau (2026-09-09) : measurements avait toute une infra de lecture
    // (BeforeAfterComparator) mais aucun chemin d'écriture nulle part dans
    // l'appli, voir components/ui/MeasurementsSection.tsx.
    getClientMeasurements(user.id),
  ]);
  const competition = competitionRow.data as { competition_category: string | null; competition_date: string | null } | null;

  return (
    <PersonalPhotosView
      photos={photos}
      uploadPersonalPhoto={uploadPersonalPhoto}
      deletePersonalPhoto={deletePersonalPhoto}
      competitionCategory={competition?.competition_category ?? null}
      competitionDate={competition?.competition_date ?? null}
      measurements={measurements}
      logMeasurement={logPersonalMeasurement}
    />
  );
}
