import { createServerSupabase } from "@/lib/supabase-server";

export interface ClientTask {
  id: string;
  client_id: string;
  created_by: string | null;
  label: string;
  icon: string;
  status: "pending" | "done";
  nag_minutes: number;
  last_notified_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export async function getClientTasks(clientId: string): Promise<ClientTask[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("client_tasks")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    return (data as ClientTask[]) ?? [];
  } catch {
    return [];
  }
}
