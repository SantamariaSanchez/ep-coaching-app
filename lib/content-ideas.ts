import { createAdminClient } from "@/lib/supabase-admin";
import { isMissingColumnError } from "@/lib/coach-ideation";

// Axe 2 (VISION.md) : espace de création de contenu du coach. Table
// entièrement scopée par coach_id — chaque coach ne voit et ne modifie que
// ses propres idées (RLS + garde applicative, voir studio/actions.ts).
export const CONTENT_PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "threads", "general"] as const;
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
  source: "manuel" | "question" | "funnel";
  source_question_id: string | null;
  created_at: string;
  updated_at: string;
  /** Format de contenu suggéré (lib/content-formats.ts), optionnel. */
  content_format?: string | null;
}

export async function getCoachContentIdeas(coachId: string): Promise<ContentIdea[]> {
  try {
    const admin = createAdminClient();
    const base = "id, coach_id, platform, title, notes, status, source, source_question_id, created_at, updated_at";
    const query = (cols: string) => admin.from("content_ideas").select(cols).eq("coach_id", coachId).order("updated_at", { ascending: false });
    // content_format arrive avec la migration 20261021 : sans elle, on relit sans.
    let { data, error } = await query(`${base}, content_format`);
    if (isMissingColumnError(error)) ({ data, error } = await query(base));
    return (data as unknown as ContentIdea[]) ?? [];
  } catch {
    return [];
  }
}
