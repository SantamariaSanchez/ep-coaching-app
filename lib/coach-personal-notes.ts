import { createAdminClient } from "@/lib/supabase-admin";

// Notes/pense-bête perso du coach (Axe 2, VISION.md) — un item est un todo
// dès qu'on le coche, sinon c'est juste une note en vrac, pas deux concepts
// séparés pour un simple bloc-notes perso.
export interface CoachPersonalNote {
  id: string;
  coach_id: string;
  content: string;
  done: boolean;
  created_at: string;
  updated_at: string;
}

export async function getCoachPersonalNotes(coachId: string): Promise<CoachPersonalNote[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_personal_notes")
      .select("id, coach_id, content, done, created_at, updated_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false });
    return (data as CoachPersonalNote[]) ?? [];
  } catch {
    return [];
  }
}
