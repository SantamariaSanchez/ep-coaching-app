import { createAdminClient } from "@/lib/supabase-admin";

// Axe 2 (VISION.md) : espace de création de contenu du coach. Table
// entièrement scopée par coach_id — chaque coach ne voit et ne modifie que
// ses propres idées (RLS + garde applicative, voir studio/actions.ts).
export const CONTENT_PLATFORMS = ["instagram", "youtube", "linkedin", "general"] as const;
export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number];

export const CONTENT_STATUSES = ["idee", "brouillon", "pret", "publie"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export interface ContentIdea {
  id: string;
  coach_id: string;
  platform: ContentPlatform;
  title: string;
  notes: string | null;
  status: ContentStatus;
  source: "manuel" | "question";
  source_question_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCoachContentIdeas(coachId: string): Promise<ContentIdea[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("content_ideas")
      .select("id, coach_id, platform, title, notes, status, source, source_question_id, created_at, updated_at")
      .eq("coach_id", coachId)
      .order("updated_at", { ascending: false });
    return (data as ContentIdea[]) ?? [];
  } catch {
    return [];
  }
}
