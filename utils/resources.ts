import { createServerSupabase } from "@/lib/supabase-server";

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
