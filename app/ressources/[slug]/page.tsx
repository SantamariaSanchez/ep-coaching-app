import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLeadMagnet, getLeadMagnetSlugs } from "@/lib/lead-magnets";
import LeadMagnetLanding from "@/components/ressources/LeadMagnetLanding";
import { submitLead } from "../actions";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

// À l'échelle visée (jusqu'à ~1000 lead magnets, produits en continu par une
// routine cloud), pré-générer toutes les pages au build ralentirait le build
// pour rien : on ne fige que les plus récentes, le reste se génère à la
// première visite (ISR — dynamicParams reste à true par défaut) et est mis
// en cache ensuite. Voir revalidate ci-dessous.
const MAX_STATIC_PARAMS = 60;

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getLeadMagnetSlugs();
  return slugs.slice(0, MAX_STATIC_PARAMS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const magnet = await getLeadMagnet(slug);
  if (!magnet) return {};
  const url = `${APP_URL}/ressources/${slug}`;
  const title = `${magnet.title} : EP Coaching`;
  // Sans ce bloc, chaque partage (WhatsApp, réseaux, SMS) d'un des ~700+
  // lead magnets affichait l'aperçu générique "EP Coaching" du layout
  // racine au lieu du titre/accroche réel du guide : openGraph/twitter ne
  // sont jamais fusionnés champ par champ avec le parent par Next, un enfant
  // qui ne les redéclare pas hérite tel quel de l'objet générique.
  return {
    title,
    description: magnet.hook,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description: magnet.hook,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: magnet.hook,
    },
  };
}

export default async function LeadMagnetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const magnet = await getLeadMagnet(slug);
  if (!magnet) notFound();

  // Titre/accroche/catégorie sont déjà affichés sans capture (voir Header
  // dans LeadMagnetLanding, rendu hors du bloc `unlocked`) : reprendre
  // exactement ces mêmes champs ici n'expose rien de plus à un robot qu'à un
  // visiteur humain non converti, donc aucun risque de cloaking.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: magnet.title,
    description: magnet.hook,
    articleSection: magnet.category,
    url: `${APP_URL}/ressources/${slug}`,
    publisher: {
      "@type": "Organization",
      name: "EP Coaching",
      url: APP_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LeadMagnetLanding magnet={magnet} submitLead={submitLead} />
    </>
  );
}
