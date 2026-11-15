import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { Db } from "@/lib/db-types";

export interface VideoAnnotation {
  timestamp_seconds: number;
  note: string;
}

export interface ExerciseCorrection {
  id: string;
  client_id: string;
  exercise_name: string;
  objective: string;
  // Historique : lien Google Drive, avant le passage à l'upload natif.
  video_link: string | null;
  video_path: string | null;
  client_question: string | null;
  status: "pending" | "answered";
  coach_feedback: string | null;
  coach_video_link: string | null;
  coach_video_path: string | null;
  // Item 22 : notes du coach horodatées sur la vidéo du CLIENT (pas sa
  // propre vidéo de réponse) — "à 0:15, redresse le dos".
  video_annotations: VideoAnnotation[] | null;
  created_at: string;
  answered_at: string | null;
}

export interface ExerciseCorrectionWithClient extends ExerciseCorrection {
  profiles: { full_name: string | null; email: string | null } | null;
}

// Forme retournée par getClientCorrections : video_link/coach_video_link
// bruts (legacy Drive) + video_url/coach_video_url déjà résolues en URLs
// signées quand un upload natif existe.
export type ExerciseCorrectionResolved = ExerciseCorrection & {
  video_url: string | null;
  coach_video_url: string | null;
};

/** Préfixe d'une vidéo de série (bucket set-videos) dans exercise_corrections.video_path. */
export const SET_VIDEO_PREFIX = "set-videos:";

/**
 * Chemin set-videos d'une correction, seulement s'il est dans le dossier du
 * client lui-même (le bucket range chaque vidéo sous « {id du client}/ »).
 * La colonne est écrite par le client : sans ce contrôle, il pourrait faire
 * signer la vidéo de quelqu'un d'autre.
 */
export function setVideoPathOf(row: { video_path: string | null; client_id?: string | null }): string | null {
  if (!row.video_path?.startsWith(SET_VIDEO_PREFIX) || !row.client_id) return null;
  const path = row.video_path.slice(SET_VIDEO_PREFIX.length);
  if (!path.startsWith(`${row.client_id}/`) || path.includes("..")) return null;
  return path;
}

// Transforme video_path/coach_video_path (upload natif) en URLs signées.
// Les dépôts d'avant ce changement n'ont que video_link/coach_video_link
// (lien Drive externe) et n'ont donc rien à résoudre ici.
async function attachCorrectionVideoUrls<T extends { video_path: string | null; coach_video_path: string | null; client_id?: string | null }>(
  rows: T[]
): Promise<(T & { video_url: string | null; coach_video_url: string | null })[]> {
  const supabase = await createServerSupabase();
  return Promise.all(
    rows.map(async (row) => {
      // « set-videos:… » : vidéo d'une série envoyée depuis la séance
      // (route send-video), rangée dans le bucket privé set-videos. La ligne
      // a déjà été lue sous RLS (coach du client ou client lui-même), la
      // signature passe donc par le client admin.
      const video_url = row.video_path
        ? row.video_path.startsWith(SET_VIDEO_PREFIX)
          ? setVideoPathOf(row) ? (await createAdminClient().storage.from("set-videos").createSignedUrl(setVideoPathOf(row)!, 3600)).data?.signedUrl ?? null : null
          : (await supabase.storage.from("correction-videos").createSignedUrl(row.video_path, 3600)).data?.signedUrl ?? null
        : null;
      const coach_video_url = row.coach_video_path
        ? (await supabase.storage.from("coach-videos").createSignedUrl(row.coach_video_path, 3600)).data?.signedUrl ?? null
        : null;
      return { ...row, video_url, coach_video_url };
    })
  );
}

export async function getClientCorrections(
  clientId: string, db?: Db
): Promise<ExerciseCorrectionResolved[]> {
  try {
    const supabase = db ?? (await createServerSupabase());
    const { data } = await supabase
      .from("exercise_corrections")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    return await attachCorrectionVideoUrls((data as ExerciseCorrection[]) ?? []);
  } catch {
    return [];
  }
}

export async function getPendingCorrectionsWithClient(): Promise<ExerciseCorrectionWithClient[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("exercise_corrections")
      .select("*, profiles:client_id(full_name, email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    return (data as ExerciseCorrectionWithClient[]) ?? [];
  } catch {
    return [];
  }
}

export async function getDoneCorrectionsWithClient(): Promise<ExerciseCorrectionWithClient[]> {
  try {
    const supabase = await createServerSupabase();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data } = await supabase
      .from("exercise_corrections")
      .select("*, profiles:client_id(full_name, email)")
      .eq("status", "answered")
      .gte("answered_at", thirtyDaysAgo.toISOString())
      .order("answered_at", { ascending: false });
    return (data as ExerciseCorrectionWithClient[]) ?? [];
  } catch {
    return [];
  }
}

export async function getPendingCorrectionsCount(): Promise<number> {
  try {
    const supabase = await createServerSupabase();
    // Retour direct 2026-09-11 : même correctif que getPendingPhotoUpdatesCount
    // (utils/photos.ts) — la propre donnée du coach (is_own_coach de
    // lui-même) ne doit jamais compter comme un signal client en attente.
    const { data: { user } } = await supabase.auth.getUser();
    let query = supabase.from("exercise_corrections").select("id", { count: "exact", head: true }).eq("status", "pending");
    if (user) query = query.neq("client_id", user.id);
    const { count } = await query;
    return count ?? 0;
  } catch {
    return 0;
  }
}
