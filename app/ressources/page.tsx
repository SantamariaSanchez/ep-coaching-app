import type { Metadata } from "next";
import { getResourcesPublic } from "@/utils/resources";
import { GUIDE_KEYWORDS } from "@/lib/guide-keywords";
import { getAllLeadMagnets } from "@/lib/lead-magnets";
import { getUser, getProfile } from "@/utils/auth";
import PublicRessourcesClient from "@/components/ressources/PublicRessourcesClient";
import NewsletterSignupForm from "@/components/newsletter/NewsletterSignupForm";

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
    <>
      <PublicRessourcesClient
        resources={resources}
        leadMagnets={leadMagnets}
        initialQuery={initialQuery}
        isCoach={isCoach}
      />
      {/* Point d'entree organique confirme (voir commentaire metadata
          ci-dessus) : quelqu'un qui lit un guide gratuit ici est un
          candidat naturel a la newsletter quotidienne. */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px 56px" }}>
        <div className="ep-card-flat" style={{ padding: 16 }}>
          <NewsletterSignupForm source="ressources" />
        </div>
      </div>
    </>
  );
}
