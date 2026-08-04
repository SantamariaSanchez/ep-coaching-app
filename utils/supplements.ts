import { createServerSupabase } from "@/lib/supabase-server";

export interface ClientSupplement {
  id: string;
  client_id: string;
  name: string;
  dosage: string | null;
  timing: string | null;
  notes: string | null;
  suggested_by: string | null;
  suggested_by_name?: string | null;
  status: "active" | "stopped";
  created_at: string;
}

export async function getClientSupplements(
  clientId: string
): Promise<ClientSupplement[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("client_supplements")
      .select("*, coach:suggested_by(full_name)")
      .eq("client_id", clientId)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });
    return (
      (data as (ClientSupplement & { coach: { full_name: string | null } | null })[]) ?? []
    ).map((row) => ({
      ...row,
      suggested_by_name: row.coach?.full_name ?? null,
    }));
  } catch {
    return [];
  }
}
