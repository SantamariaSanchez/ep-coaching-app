import { getResourcesPublic } from "@/utils/resources";
import { GUIDE_KEYWORDS } from "@/lib/guide-keywords";
import { LEAD_MAGNETS } from "@/lib/lead-magnets";
import PublicRessourcesClient from "@/components/ressources/PublicRessourcesClient";

export default async function PublicRessourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ guide?: string }>;
}) {
  const { guide } = await searchParams;
  const initialQuery = (guide && GUIDE_KEYWORDS[guide]) || "";

  const resources = await getResourcesPublic();

  return (
    <PublicRessourcesClient
      resources={resources}
      leadMagnets={LEAD_MAGNETS}
      initialQuery={initialQuery}
    />
  );
}
