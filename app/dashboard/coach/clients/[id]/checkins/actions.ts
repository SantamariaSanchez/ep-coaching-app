"use server";
import { requireCoach } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

type ReplyState = { error: string } | { success: true } | null;

export async function replyToCheckin(
  prevState: ReplyState,
  formData: FormData
): Promise<ReplyState> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  const checkinId = formData.get("checkin_id") as string;
  const clientId = formData.get("client_id") as string;
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
  const guard = await requireCoach();
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
  const guard = await requireCoach();
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
