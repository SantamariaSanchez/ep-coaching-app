import { createAdminClient } from "@/lib/supabase-admin";
import { cleanPositioning, EMPTY_POSITIONING, type Positioning } from "@/lib/positioning";

export async function getPositioning(ownerId: string): Promise<{ data: Positioning; updatedAt: string | null }> {
  const { data } = await createAdminClient().from("coach_positioning").select("data, updated_at").eq("owner_id", ownerId).maybeSingle();
  if (!data) return { data: EMPTY_POSITIONING, updatedAt: null };
  return { data: cleanPositioning(data.data), updatedAt: data.updated_at as string };
}
