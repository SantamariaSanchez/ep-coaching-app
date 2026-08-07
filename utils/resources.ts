import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { type ResourceItem } from "@/lib/resource-categories";

export { RESOURCE_CATEGORIES, type ResourceCategory, type ResourceItem } from "@/lib/resource-categories";

const SELECT_FIELDS = "id, title, description, file_url, category, created_at";

// Scopée par coach : sans le .eq("created_by", ...), chaque coach de la
// plateforme voyait les ressources de TOUS les autres coachs (upload comme
// suppression étaient déjà cloisonnés par propriétaire côté API, mais la
// lecture, elle, ne l'était pas) — même famille de bug que le cloisonnement
// multi-coach déjà corrigé ailleurs (études internes, etc.). coachId est le
// coach lui-même côté dashboard coach, ou profile.coach_id du client côté
// dashboard client (voir call sites).
export async function getResources(coachId: string): Promise<ResourceItem[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("resources")
      .select(SELECT_FIELDS)
      .eq("created_by", coachId)
      .order("created_at", { ascending: false });
    return (data as ResourceItem[]) ?? [];
  } catch {
    return [];
  }
}

// Used by the public, unauthenticated /ressources funnel page — bypasses RLS
// with the admin client since there is no user session to read it as.
export async function getResourcesPublic(): Promise<ResourceItem[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("resources")
      .select(SELECT_FIELDS)
      .order("created_at", { ascending: false });
    return (data as ResourceItem[]) ?? [];
  } catch {
    return [];
  }
}
