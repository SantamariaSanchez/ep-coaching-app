import { getResourcesPublic } from "@/utils/resources";
import { GUIDE_KEYWORDS } from "@/lib/guide-keywords";
import PublicRessourcesClient from "@/components/ressources/PublicRessourcesClient";

export default async function PublicRessourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ guide?: string }>;
}) {
  const { guide } = await searchParams;
  const initialQuery = (guide && GUIDE_KEYWORDS[guide]) || "";

  const resources = await getResourcesPublic();

  return <PublicRessourcesClient resources={resources} initialQuery={initialQuery} />;
}
