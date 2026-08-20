import { createAdminClient } from "@/lib/supabase-admin";

// Fichiers perso du coach (Axe 2, VISION.md) — même convention que
// utils/personal-photos.ts : bucket privé, URL signée à la lecture,
// jamais d'URL publique stockée en dur.
export interface CoachPersonalFile {
  id: string;
  coach_id: string;
  storage_path: string;
  filename: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
  url: string | null;
}

export async function getCoachPersonalFiles(coachId: string): Promise<CoachPersonalFile[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_personal_files")
      .select("id, coach_id, storage_path, filename, file_type, size_bytes, created_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false });

    const rows = (data as Omit<CoachPersonalFile, "url">[]) ?? [];
    if (rows.length === 0) return [];

    const signed = await Promise.all(
      rows.map((r) => admin.storage.from("coach-personal-files").createSignedUrl(r.storage_path, 3600))
    );

    return rows.map((r, i) => ({ ...r, url: signed[i].data?.signedUrl ?? null }));
  } catch {
    return [];
  }
}
