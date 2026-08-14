import { getResourcesPublic } from "@/utils/resources";
import { GUIDE_KEYWORDS } from "@/lib/guide-keywords";
import { getAllLeadMagnets } from "@/lib/lead-magnets";
import { getUser, getProfile } from "@/utils/auth";
import PublicRessourcesClient from "@/components/ressources/PublicRessourcesClient";

export default async function PublicRessourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ guide?: string }>;
}) {
  const { guide } = await searchParams;
  const initialQuery = (guide && GUIDE_KEYWORDS[guide]) || "";

  // Page publique, accessible sans compte : un visiteur non connecté ou un
  // client connecté ne doit jamais voir les codes CTA reels (outil
  // d'organisation réservé aux coachs, voir LEADMAGNETS.md). getUser()/
  // getProfile() renvoient null proprement si personne n'est connecté.
  const [resources, leadMagnets, user] = await Promise.all([
    getResourcesPublic(),
    getAllLeadMagnets(),
    getUser(),
  ]);
  const profile = user ? await getProfile(user.id) : null;
  const isCoach = profile?.role === "coach";

  return (
    <PublicRessourcesClient
      resources={resources}
      leadMagnets={leadMagnets}
      initialQuery={initialQuery}
      isCoach={isCoach}
    />
  );
}
