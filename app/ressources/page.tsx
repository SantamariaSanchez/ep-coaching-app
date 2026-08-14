import { getResourcesPublic } from "@/utils/resources";
import { GUIDE_KEYWORDS } from "@/lib/guide-keywords";
import { getAllLeadMagnets } from "@/lib/lead-magnets";
import PublicRessourcesClient from "@/components/ressources/PublicRessourcesClient";

export default async function PublicRessourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ guide?: string }>;
}) {
  const { guide } = await searchParams;
  const initialQuery = (guide && GUIDE_KEYWORDS[guide]) || "";

  const [resources, leadMagnets] = await Promise.all([
    getResourcesPublic(),
    getAllLeadMagnets(),
  ]);

  return (
    <PublicRessourcesClient
      resources={resources}
      leadMagnets={leadMagnets}
      initialQuery={initialQuery}
    />
  );
}
