import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { type ResourceItem } from "@/lib/resource-categories";

export { RESOURCE_CATEGORIES, type ResourceCategory, type ResourceItem } from "@/lib/resource-categories";

const SELECT_FIELDS = "id, title, description, file_url, category, created_at";

export async function getResources(): Promise<ResourceItem[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("resources")
      .select(SELECT_FIELDS)
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
