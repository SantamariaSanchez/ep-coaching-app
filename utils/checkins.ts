import { createServerSupabase } from "@/lib/supabase-server";

export interface CheckIn {
  id: string;
  client_id: string;
  week_number: number;
  week_start: string;
  created_at: string;
  weight: number | null;
  weight_avg: number | null;
  nutrition_adherence: number | null;
  calories_per_day: number | null;
  steps_per_day: number | null;
  sleep_hours: number | null;
  hrv: number | null;
  resting_hr: number | null;
  digestion: number | null;
  general_feeling: number | null;
  client_notes: string | null;
  coach_notes: string | null;
  coach_rating: number | null;
  coach_replied_at: string | null;
  // Bilan system
  bilan_text: string | null;
  bilan_rating: number | null;
  bilan_sent_at: string | null;
  // Qualitative check-in questions
  physique_feeling: string | null;
  energy_mood: string | null;
  biggest_win: string | null;
  training_review: string | null;
  nutrition_review: string | null;
  digestion_review: string | null;
  work_impact: string | null;
  sleep_review: string | null;
  upcoming_obstacles: string | null;
  coach_questions: string | null;
  additional_notes: string | null;
  // Refonte 2026-07-17c
  attitude_rating: number | null;
  attitude_explanation: string | null;
  biggest_win_2: string | null;
  biggest_win_3: string | null;
  improvement_reflection: string | null;
  entourage_support: string | null;
  plan_adherence_feedback: string | null;
  preferred_feedback_format: "ecrit" | "vocal" | "video" | null;
  // Media — anciens liens Drive (check-ins pré-upload direct, gardés pour
  // affichage rétrocompatible) et chemins de stockage bruts.
  photo_drive_link: string | null;
  video_drive_link: string | null;
  photo_paths: string[] | null;
  video_path: string | null;
  // Retour vidéo type Loom du coach, attaché à ce check-in (bucket
  // "coach-videos", distinct du video_path du client ci-dessus).
  coach_video_path: string | null;
  // Alternative à coach_video_path : lien externe (ScreenPal, YouTube,
  // Vimeo...) plutôt qu'un enregistrement natif dans l'appli.
  coach_video_link: string | null;
  // Media — URLs signées prêtes à afficher, calculées par les fonctions de
  // lecture ci-dessous. Vide par défaut pour les fonctions qui n'ont pas
  // besoin d'afficher les médias (ex. stats, bilans).
  photo_urls: string[];
  video_url: string | null;
  coach_video_url: string | null;
}

export interface CheckInWithClient extends CheckIn {
  profiles: { full_name: string | null } | null;
}

export interface CheckInWithClientProfile extends CheckIn {
  profiles: { full_name: string | null; email: string | null } | null;
}

// Transforme les chemins de stockage bruts (photo_paths/video_path) en URLs
// signées prêtes à afficher — appelé par les fonctions de lecture dont le
// résultat est effectivement rendu avec les médias (pas par celles qui ne
// servent qu'à des compteurs/stats).
async function withSignedMedia<
  T extends { photo_paths: string[] | null; video_path: string | null; coach_video_path: string | null }
>(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  rows: T[]
): Promise<(T & { photo_urls: string[]; video_url: string | null; coach_video_url: string | null })[]> {
  return Promise.all(
    rows.map(async (row) => {
      const photo_urls = row.photo_paths?.length
        ? (
            await Promise.all(
              row.photo_paths.map((p) => supabase.storage.from("checkin-media").createSignedUrl(p, 3600))
            )
          )
            .map((r) => r.data?.signedUrl ?? null)
            .filter((u): u is string => !!u)
        : [];
      const video_url = row.video_path
        ? (await supabase.storage.from("checkin-media").createSignedUrl(row.video_path, 3600)).data?.signedUrl ?? null
        : null;
      const coach_video_url = row.coach_video_path
        ? (await supabase.storage.from("coach-videos").createSignedUrl(row.coach_video_path, 3600)).data?.signedUrl ?? null
        : null;
      return { ...row, photo_urls, video_url, coach_video_url };
    })
  );
}

export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export function getISOWeek(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function getThisWeekCheckin(clientId: string): Promise<CheckIn | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("check_ins")
      .select("*")
      .eq("client_id", clientId)
      .eq("week_start", getWeekStart())
      .maybeSingle();
    if (!data) return null;
    const [signed] = await withSignedMedia(supabase, [data as CheckIn]);
    return signed;
  } catch {
    return null;
  }
}

export async function getClientCheckins(clientId: string): Promise<CheckIn[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("check_ins")
      .select("*")
      .eq("client_id", clientId)
      .order("week_start", { ascending: false });
    return await withSignedMedia(supabase, (data as CheckIn[]) ?? []);
  } catch {
    return [];
  }
}

export async function getClientPastCheckins(clientId: string): Promise<CheckIn[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("check_ins")
      .select("*")
      .eq("client_id", clientId)
      .lt("week_start", getWeekStart())
      .order("week_start", { ascending: false });
    return await withSignedMedia(supabase, (data as CheckIn[]) ?? []);
  } catch {
    return [];
  }
}

export async function getWeeklyCheckinCount(): Promise<number> {
  try {
    const supabase = await createServerSupabase();
    const weekStart = getWeekStart();
    const { count } = await supabase
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .gte("week_start", weekStart);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getPendingReplies(): Promise<CheckInWithClient[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("check_ins")
      .select("*, profiles:client_id(full_name)")
      .is("coach_replied_at", null)
      .order("created_at", { ascending: false })
      .limit(10);
    return (data as CheckInWithClient[]) ?? [];
  } catch {
    return [];
  }
}

// ── Bilan system ──────────────────────────────────────────────────────────────
// Le retour au check-in hebdo se fait désormais uniquement depuis l'onglet
// Check-ins de chaque client (coach_notes/coach_rating/coach_video_path via
// replyToCheckin/attachCoachVideo) — plus de page Bilan séparée, donc plus
// besoin de compter sur bilan_sent_at, qui ne bougera plus jamais.

export async function getPendingBilansCount(): Promise<number> {
  try {
    // Client de session (pas admin) : la RLS de check_ins filtre déjà par
    // client_id = auth.uid() ou is_own_coach(client_id), donc un coach ne
    // voit jamais que les bilans de ses propres clients.
    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .is("coach_replied_at", null);
    return count ?? 0;
  } catch {
    return 0;
  }
}
