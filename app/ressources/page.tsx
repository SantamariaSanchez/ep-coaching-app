import type { Metadata } from "next";
import { getResourcesPublic } from "@/utils/resources";
import { GUIDE_KEYWORDS } from "@/lib/guide-keywords";
import { getAllLeadMagnets } from "@/lib/lead-magnets";
import { getUser, getProfile } from "@/utils/auth";
import PublicRessourcesClient from "@/components/ressources/PublicRessourcesClient";

// MASTERCLASS (audit métadonnées SEO, 2026-08-16) : cette page est le
// principal point d'entrée organique (lead magnets/guides gratuits,
// canal d'acquisition confirmé explicitement le 2026-08-16) et n'avait
// aucun titre/description dédié, elle retombait sur le fallback générique
// "EP Coaching" du layout racine.
export const metadata: Metadata = {
  title: "Ressources gratuites : guides et fiches | EP Coaching",
  description:
    "Guides et fiches gratuits sur l'entraînement, la nutrition et la psychologie du sport, sans inscription. Basés sur la littérature scientifique quand elle existe.",
};

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
