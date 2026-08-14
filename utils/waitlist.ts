import { createAdminClient } from "@/lib/supabase-admin";

// Item 45 (chantier 50 idées) : liste d'attente coaching.
export interface WaitlistEntry {
  id: string;
  member_id: string;
  member_name: string | null;
  note: string | null;
  created_at: string;
  contacted_at: string | null;
}

export async function getCoachWaitlist(coachId: string): Promise<WaitlistEntry[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coaching_waitlist")
      .select("id, member_id, note, created_at, contacted_at, member:member_id(full_name)")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: true });
    return (
      (data as {
        id: string;
        member_id: string;
        note: string | null;
        created_at: string;
        contacted_at: string | null;
        // PostgREST renvoie la relation embarquée sous forme de tableau côté
        // typage même pour un to-one (FK simple) — on ne garde que le premier.
        member: { full_name: string | null }[] | null;
      }[]) ?? []
    ).map((row) => ({
      id: row.id,
      member_id: row.member_id,
      member_name: row.member?.[0]?.full_name ?? null,
      note: row.note,
      created_at: row.created_at,
      contacted_at: row.contacted_at,
    }));
  } catch {
    return [];
  }
}

// Par défaut true : un coach existant qui n'a jamais touché ce réglage
// continue d'accepter des clients comme avant ce chantier.
export async function isCoachAcceptingNewClients(coachId: string | null): Promise<boolean> {
  if (!coachId) return true;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("accepting_new_clients")
      .eq("id", coachId)
      .maybeSingle();
    return (data as { accepting_new_clients: boolean } | null)?.accepting_new_clients ?? true;
  } catch {
    return true;
  }
}

export async function isOnWaitlist(coachId: string, memberId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("coaching_waitlist")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", coachId)
      .eq("member_id", memberId);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}
