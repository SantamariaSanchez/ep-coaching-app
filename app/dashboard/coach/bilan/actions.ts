"use server";
import { requireCoach } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import {
  notifyClientBilanReady,
  notifyClientPhotoFeedback,
} from "@/app/actions/notifications";

type ActionState = { error?: string; success?: boolean } | null;

export async function sendBilan(
  checkinId: string,
  clientId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const bilan_text = (formData.get("bilan_text") as string)?.trim();
  const bilan_rating_raw = formData.get("bilan_rating") as string;
  const bilan_rating = bilan_rating_raw ? parseInt(bilan_rating_raw, 10) : null;

  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  if (!bilan_text) return { error: "Le retour écrit est obligatoire." };
  if (bilan_rating !== null && (bilan_rating < 1 || bilan_rating > 10)) {
    return { error: "La note doit être entre 1 et 10." };
  }

  const supabase = createAdminClient(); // admin bypasses RLS for coach writing bilan data

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("check_ins")
    .update({
      bilan_text,
      bilan_rating: bilan_rating ?? null,
      bilan_sent_at: now,
      coach_replied_at: now,
    })
    .eq("id", checkinId);

  if (error) {
    console.error("sendBilan error:", error.message, "| checkinId:", checkinId);
    return { error: "Erreur sauvegarde: " + error.message };
  }

  // Fetch client info for notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", clientId)
    .single();

  if (profile?.email && profile?.full_name) {
    notifyClientBilanReady(profile.email, profile.full_name, clientId).catch(() => {});
  }

  revalidatePath("/dashboard/coach/bilan");
  revalidatePath("/dashboard/client/checkin");
  revalidatePath("/dashboard/coach");
  return { success: true };
}

// Retour vidéo type Loom attaché au bilan — même colonne que l'ancien flux
// /checkins (check_ins.coach_video_path), le fichier est déjà uploadé côté
// client (voir CoachVideoRecorder), on ne reçoit ici que le chemin de stockage.
export async function attachBilanVideo(
  checkinId: string,
  clientId: string,
  videoPath: string
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("check_ins")
    .update({ coach_video_path: videoPath })
    .eq("id", checkinId)
    .eq("client_id", clientId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/bilan");
  revalidatePath("/dashboard/client/checkin");
  return {};
}

export async function sendCorrectionFeedbackBilan(
  correctionId: string,
  clientId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const coach_feedback = (formData.get("coach_feedback") as string)?.trim();
  const coach_video_link =
    (formData.get("coach_video_link") as string)?.trim() || null;

  if (!coach_feedback) return { error: "Le retour écrit est obligatoire." };

  const supabase = createAdminClient(); // admin bypasses RLS for coach writing bilan data
  const { error } = await supabase
    .from("exercise_corrections")
    .update({
      coach_feedback,
      coach_video_link,
      status: "answered",
      answered_at: new Date().toISOString(),
    })
    .eq("id", correctionId);

  if (error) return { error: "Erreur lors de l'envoi du retour." };

  revalidatePath("/dashboard/coach/bilan");
  revalidatePath(`/dashboard/coach/clients/${clientId}/program`);
  revalidatePath("/dashboard/client/program");
  revalidatePath("/dashboard/coach");
  return { success: true };
}

export async function sendPhotoFeedbackBilan(
  photoId: string,
  clientId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const coach_feedback = (formData.get("coach_feedback") as string)?.trim();
  if (!coach_feedback) return { error: "Le retour est obligatoire." };

  const supabase = createAdminClient(); // admin bypasses RLS for coach writing bilan data

  const { error } = await supabase
    .from("photo_updates")
    .update({
      coach_feedback,
      coach_replied_at: new Date().toISOString(),
    })
    .eq("id", photoId);

  if (error) return { error: "Erreur lors de l'envoi du retour." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", clientId)
    .single();

  if (profile?.email && profile?.full_name) {
    notifyClientPhotoFeedback(profile.email, profile.full_name, clientId).catch(() => {});
  }

  revalidatePath("/dashboard/coach/bilan");
  revalidatePath(`/dashboard/coach/clients/${clientId}/photos`);
  revalidatePath("/dashboard/client/photos");
  return { success: true };
}
