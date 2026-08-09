import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLeadMagnet, LEAD_MAGNETS } from "@/lib/lead-magnets";
import LeadMagnetLanding from "@/components/ressources/LeadMagnetLanding";
import { submitLead } from "../actions";

export function generateStaticParams() {
  return LEAD_MAGNETS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const magnet = getLeadMagnet(slug);
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
  const magnet = getLeadMagnet(slug);
  if (!magnet) notFound();

  return <LeadMagnetLanding magnet={magnet} submitLead={submitLead} />;
}
