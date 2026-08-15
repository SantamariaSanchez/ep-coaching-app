import { createAdminClient } from "@/lib/supabase-admin";

// Idéation (ex "Idées & brouillons", voir lib/content-ideas.ts pour le
// pipeline idée/brouillon/prêt/publié) — deux ajouts du 2026-08-15 : prise
// de notes libre et swipe file de références externes. Tables distinctes
// de coach_notes (notes de suivi hebdo PAR CLIENT, sans rapport).

export interface IdeationNote {
  id: string;
  coach_id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export async function getIdeationNotes(coachId: string): Promise<IdeationNote[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_ideation_notes")
      .select("id, coach_id, title, body, pinned, created_at, updated_at")
      .eq("coach_id", coachId)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    return (data as IdeationNote[]) ?? [];
  } catch {
    return [];
  }
}

export const INSPIRATION_PLATFORMS = ["instagram", "youtube", "linkedin", "general"] as const;
export type InspirationPlatform = (typeof INSPIRATION_PLATFORMS)[number];

export interface Inspiration {
  id: string;
  coach_id: string;
  url: string;
  platform: InspirationPlatform;
  note: string | null;
  created_at: string;
}

export async function getInspirations(coachId: string): Promise<Inspiration[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_inspirations")
      .select("id, coach_id, url, platform, note, created_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false });
    return (data as Inspiration[]) ?? [];
  } catch {
    return [];
  }
}
