import { createServerSupabase } from "@/lib/supabase-server";

export interface ResourceRequest {
  id: string;
  author_id: string;
  author_name: string;
  title: string;
  content: string;
  status: "open" | "answered";
  coach_response: string | null;
  created_at: string;
  answered_at: string | null;
}

export async function getResourceRequests(): Promise<ResourceRequest[]> {
  try {
    const supabase = await createServerSupabase();
    const { data: requests } = await supabase
      .from("resource_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!requests || requests.length === 0) return [];

    const authorIds = [...new Set(requests.map((r) => r.author_id as string))];
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);

    const nameMap: Record<string, string> = {};
    for (const a of (authors ?? []) as { id: string; full_name: string | null }[]) {
      nameMap[a.id] = a.full_name ?? "Membre";
    }

    return requests.map((r) => ({
      ...r,
      author_name: nameMap[r.author_id] ?? "Membre",
    })) as ResourceRequest[];
  } catch {
    return [];
  }
}
