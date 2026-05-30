"use server";

import { createServerSupabase } from "@/lib/supabase-server";
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

  if (!bilan_text) return { error: "Le retour écrit est obligatoire." };
  if (bilan_rating !== null && (bilan_rating < 1 || bilan_rating > 10)) {
    return { error: "La note doit être entre 1 et 10." };
  }

  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("check_ins")
    .update({
      bilan_text,
      bilan_rating: bilan_rating ?? null,
      bilan_sent_at: new Date().toISOString(),
    })
    .eq("id", checkinId);

  if (error) return { error: "Erreur lors de l'envoi du bilan." };

  // Fetch client info for notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", clientId)
    .single();

  if (profile?.email && profile?.full_name) {
    notifyClientBilanReady(profile.email, profile.full_name).catch(() => {});
  }

  revalidatePath("/dashboard/coach/bilan");
  revalidatePath("/dashboard/client/checkin");
  revalidatePath("/dashboard/coach");
  return { success: true };
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

  const supabase = await createServerSupabase();
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

  const supabase = await createServerSupabase();

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
    notifyClientPhotoFeedback(profile.email, profile.full_name).catch(() => {});
  }

  revalidatePath("/dashboard/coach/bilan");
  revalidatePath(`/dashboard/coach/clients/${clientId}/photos`);
  revalidatePath("/dashboard/client/photos");
  return { success: true };
}
