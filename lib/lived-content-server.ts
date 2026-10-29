import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { isLivedNote, mondayStart, type LivedNoteLike } from "@/lib/lived-content";

/** Notes « vécu » de la personne sur les `days` derniers jours (les plus récentes d'abord). */
export async function getLivedNotes(ownerId: string, days = 60, limit = 40): Promise<LivedNoteLike[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await createAdminClient()
    .from("notes")
    .select("id, title, body, tags, created_at")
    .eq("owner_id", ownerId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(400);
  return ((data ?? []) as LivedNoteLike[]).filter((n) => isLivedNote(n.tags)).slice(0, limit);
}

/** A-t-il déjà raconté son vécu depuis lundi ? (sert à la carte et au rappel) */
export async function hasLivedThisWeek(ownerId: string, now: Date = new Date()): Promise<boolean> {
  const since = mondayStart(now).toISOString();
  const { data } = await createAdminClient()
    .from("notes")
    .select("tags")
    .eq("owner_id", ownerId)
    .gte("created_at", since)
    .limit(300);
  return ((data ?? []) as { tags: string[] }[]).some((n) => isLivedNote(n.tags));
}
