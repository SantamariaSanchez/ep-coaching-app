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

// Scopé par coach : resource_requests n'a pas de colonne coach_id (une seule
// table pour toute la plateforme), et la policy RLS lit "authenticated" sans
// distinction — sans ce filtre, un client (ou un coach) voit et peut
// répondre aux demandes adressées à N'IMPORTE QUEL AUTRE coach de la
// plateforme. On passe par les clients du coach (profiles.coach_id) plutôt
// que d'ajouter une migration, ça reste correct même sur les lignes déjà en
// base. coachId : le coach lui-même côté dashboard coach, ou
// profile.coach_id du client côté dashboard client.
export async function getResourceRequests(coachId: string): Promise<ResourceRequest[]> {
  if (!coachId) return [];
  try {
    const supabase = await createServerSupabase();
    const { data: clients } = await supabase.from("profiles").select("id").eq("coach_id", coachId);
    const authorIds = [...new Set([...(clients ?? []).map((c) => c.id as string), coachId])];

    const { data: requests } = await supabase
      .from("resource_requests")
      .select("*")
      .in("author_id", authorIds)
      .order("created_at", { ascending: false });

    if (!requests || requests.length === 0) return [];

    const requestAuthorIds = [...new Set(requests.map((r) => r.author_id as string))];
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", requestAuthorIds);

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
