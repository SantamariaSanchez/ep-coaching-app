import { createServerSupabase } from "@/lib/supabase-server";
import type { SubmissionType } from "@/lib/posing-data";

export interface PhotoUpdate {
  id: string;
  client_id: string;
  submitted_at: string;
  week_number: number | null;
  type: SubmissionType;
  category: string;
  // Legacy — check-ins soumis avant l'upload direct, gardés pour affichage
  // rétrocompatible.
  drive_link: string | null;
  photo_paths: string[] | null;
  video_path: string | null;
  // URLs signées prêtes à afficher, calculées par les fonctions de lecture.
  photo_urls: string[];
  video_url: string | null;
  notes: string | null;
  coach_feedback: string | null;
  coach_replied_at: string | null;
  created_at: string;
}

export interface PhotoUpdateWithClient extends PhotoUpdate {
  profiles: { full_name: string | null; email: string | null } | null;
}

// Transforme les chemins de stockage bruts en URLs signées prêtes à
// afficher — même logique que withSignedMedia dans utils/checkins.ts.
async function withSignedMedia<T extends { photo_paths: string[] | null; video_path: string | null }>(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  rows: T[]
): Promise<(T & { photo_urls: string[]; video_url: string | null })[]> {
  return Promise.all(
    rows.map(async (row) => {
      const photo_urls = row.photo_paths?.length
        ? (
            await Promise.all(
              row.photo_paths.map((p) => supabase.storage.from("photo-updates-media").createSignedUrl(p, 3600))
            )
          )
            .map((r) => r.data?.signedUrl ?? null)
            .filter((u): u is string => !!u)
        : [];
      const video_url = row.video_path
        ? (await supabase.storage.from("photo-updates-media").createSignedUrl(row.video_path, 3600)).data?.signedUrl ?? null
        : null;
      return { ...row, photo_urls, video_url };
    })
  );
}

// ── Client queries ─────────────────────────────────────────────────────────────

export async function getClientPhotoUpdates(
  clientId: string,
  limit = 20
): Promise<PhotoUpdate[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("photo_updates")
      .select("*")
      .eq("client_id", clientId)
      .order("submitted_at", { ascending: false })
      .limit(limit);
    return await withSignedMedia(supabase, (data as PhotoUpdate[]) ?? []);
  } catch {
    return [];
  }
}

export async function getThisWeekPhotoUpdate(
  clientId: string
): Promise<PhotoUpdate | null> {
  try {
    const supabase = await createServerSupabase();
    // Get Monday of current week
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    const mondayStr = monday.toISOString().split("T")[0];

    const { data } = await supabase
      .from("photo_updates")
      .select("*")
      .eq("client_id", clientId)
      .gte("submitted_at", mondayStr)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const [signed] = await withSignedMedia(supabase, [data as PhotoUpdate]);
    return signed;
  } catch {
    return null;
  }
}

export async function getTodayPhotoUpdate(
  clientId: string
): Promise<PhotoUpdate | null> {
  try {
    const supabase = await createServerSupabase();
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("photo_updates")
      .select("*")
      .eq("client_id", clientId)
      .eq("submitted_at", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const [signed] = await withSignedMedia(supabase, [data as PhotoUpdate]);
    return signed;
  } catch {
    return null;
  }
}

// ── Coach queries ─────────────────────────────────────────────────────────────

export async function getPendingPhotoUpdates(): Promise<PhotoUpdateWithClient[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("photo_updates")
      .select("*, profiles(full_name, email)")
      .is("coach_replied_at", null)
      .order("created_at", { ascending: true });
    return await withSignedMedia(supabase, (data as PhotoUpdateWithClient[]) ?? []);
  } catch {
    return [];
  }
}

export async function getPendingPhotoUpdatesCount(): Promise<number> {
  try {
    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from("photo_updates")
      .select("*", { count: "exact", head: true })
      .is("coach_replied_at", null);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getAllClientPhotoUpdates(
  clientId: string
): Promise<PhotoUpdate[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("photo_updates")
      .select("*")
      .eq("client_id", clientId)
      .order("submitted_at", { ascending: false });
    return await withSignedMedia(supabase, (data as PhotoUpdate[]) ?? []);
  } catch {
    return [];
  }
}
