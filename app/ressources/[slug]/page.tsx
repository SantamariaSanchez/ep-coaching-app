import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLeadMagnet, getLeadMagnetSlugs } from "@/lib/lead-magnets";
import LeadMagnetLanding from "@/components/ressources/LeadMagnetLanding";
import { submitLead } from "../actions";

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
  return {
    title: `${magnet.title} : EP Coaching`,
    description: magnet.hook,
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

  return <LeadMagnetLanding magnet={magnet} submitLead={submitLead} />;
}
