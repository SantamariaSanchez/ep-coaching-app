import type { Metadata } from "next";
import { GUIDE_KEYWORDS } from "@/lib/guide-keywords";
import { getAllLeadMagnets } from "@/lib/lead-magnets";
import { getUser, getProfile } from "@/utils/auth";
import { getPublicVictories } from "@/utils/community";
import PublicRessourcesClient from "@/components/ressources/PublicRessourcesClient";
import NewsletterSignupForm from "@/components/newsletter/NewsletterSignupForm";

// MASTERCLASS (audit métadonnées SEO, 2026-08-16) : cette page est le
// principal point d'entrée organique (lead magnets/guides gratuits,
// canal d'acquisition confirmé explicitement le 2026-08-16) et n'avait
// aucun titre/description dédié, elle retombait sur le fallback générique
// "EP Coaching" du layout racine.
const TITLE = "Ressources gratuites : guides et fiches | EP Coaching";
const DESCRIPTION =
  "Guides et fiches gratuits sur l'entraînement, la nutrition et la psychologie du sport, sans inscription. Basés sur la littérature scientifique quand elle existe.";

// canonical explicite : la page accepte ?guide=xxx pour préremplir la
// recherche (voir plus bas), sans quoi ces variantes pourraient être vues
// comme du contenu dupliqué distinct de l'URL nue.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ressources" },
  openGraph: { url: "/ressources", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
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
  const [leadMagnets, user, victories] = await Promise.all([
    getAllLeadMagnets(),
    getUser(),
    // Même bug corrigé sur app/bio et app/page.tsx (audit de cohérence
    // 2026-09-01) : la carte "Réussites des membres" ne doit s'afficher que
    // s'il existe au moins une victoire publique réelle, sinon elle mène
    // vers un écran vide.
    getPublicVictories(1),
  ]);
  const profile = user ? await getProfile(user.id) : null;
  const isCoach = profile?.role === "coach";

  return (
    <>
      <PublicRessourcesClient
        leadMagnets={leadMagnets}
        initialQuery={initialQuery}
        isCoach={isCoach}
        hasVictories={victories.length > 0}
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
