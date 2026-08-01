"use server";
import { requireOwnClient } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

type ReplyState = { error: string } | { success: true } | null;

export async function replyToCheckin(
  prevState: ReplyState,
  formData: FormData
): Promise<ReplyState> {
  const checkinId = formData.get("checkin_id") as string;
  const clientId = formData.get("client_id") as string;
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };
  const coachNotes = (formData.get("coach_notes") as string).trim();
  const coachRating = formData.get("coach_rating") as string;

  if (!checkinId || !coachNotes) {
    return { error: "Le retour et la note sont requis." };
  }

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

  const { error } = await supabase
    .from("check_ins")
    .update({
      coach_notes: coachNotes,
      coach_rating: coachRating ? parseInt(coachRating) : null,
      coach_replied_at: new Date().toISOString(),
    })
    .eq("id", checkinId)
    .eq("client_id", clientId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/coach/clients/${clientId}/checkins`);
  revalidatePath("/dashboard/coach");
  return { success: true };
}

type DaySettingsState = { error: string } | { success: true } | null;

export async function updateCheckinDay(
  clientId: string,
  prevState: DaySettingsState,
  formData: FormData
): Promise<DaySettingsState> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const day = parseInt(formData.get("checkin_day") as string, 10);
  if (isNaN(day) || day < 1 || day > 7) return { error: "Jour invalide." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ checkin_day: day })
    .eq("id", clientId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/coach/clients/${clientId}/checkins`);
  // CheckinDaySettings est aussi rendu depuis la fiche client (onglet
  // Check-ins) — sans ça, ce cache-là restait périmé et réaffichait
  // l'ancien jour tant que la page n'était pas visitée depuis un lien
  // externe.
  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  return { success: true };
}

// Retour vidéo type Loom attaché à un check-in — le fichier est déjà
// uploadé côté client (voir CoachVideoRecorder), on ne reçoit ici que le
// chemin de stockage.
export async function attachCoachVideo(
  checkinId: string,
  clientId: string,
  videoPath: string
): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("check_ins")
    .update({ coach_video_path: videoPath })
    .eq("id", checkinId)
    .eq("client_id", clientId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/coach/clients/${clientId}/checkins`);
  return {};
}

type ActionState = { error?: string; success?: boolean } | null;

// Répondre à une demande de correction technique (soumise depuis Programme
// > "Poser une question" côté client) — vivait avant dans la page Bilan
// séparée, déplacé ici pour que tout le suivi hebdo d'un client (check-ins
// + corrections) se fasse au même endroit.
export async function sendCorrectionFeedback(
  correctionId: string,
  clientId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const coach_feedback = (formData.get("coach_feedback") as string)?.trim();
  const coach_video_path = (formData.get("coach_video_path") as string)?.trim() || null;

  if (!coach_feedback) return { error: "Le retour écrit est obligatoire." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("exercise_corrections")
    .update({
      coach_feedback,
      coach_video_path,
      status: "answered",
      answered_at: new Date().toISOString(),
    })
    .eq("id", correctionId)
    .eq("client_id", clientId);

  if (error) return { error: "Erreur lors de l'envoi du retour." };

  revalidatePath(`/dashboard/coach/clients/${clientId}/checkins`);
  revalidatePath(`/dashboard/coach/clients/${clientId}/program`);
  revalidatePath("/dashboard/client/program");
  return { success: true };
}
