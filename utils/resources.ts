import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export interface ResourceItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  created_at: string;
}

export async function getResources(): Promise<ResourceItem[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("resources")
      .select("id, title, description, file_url, created_at")
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
      .select("id, title, description, file_url, created_at")
      .order("created_at", { ascending: false });
    return (data as ResourceItem[]) ?? [];
  } catch {
    return [];
  }
}
