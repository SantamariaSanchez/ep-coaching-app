"use server";
import { requireCoach } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { notifyClientPhotoFeedback } from "@/app/actions/notifications";

type ActionState = { error?: string; success?: boolean } | null;

export async function saveCompetitionSettings(
  clientId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  const competition_category = (formData.get("competition_category") as string) || null;
  const competition_date = (formData.get("competition_date") as string) || null;

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

  const { error } = await supabase
    .from("profiles")
    .update({ competition_category, competition_date })
    .eq("id", clientId);

  if (error) return { error: "Erreur lors de la sauvegarde." };

  // Call the DB function to update photo_frequency
  try { await supabase.rpc("update_photo_frequency"); } catch {}

  revalidatePath(`/dashboard/coach/clients/${clientId}/photos`);
  return { success: true };
}

export async function sendPhotoFeedback(
  photoId: string,
  clientId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const coach_feedback = (formData.get("coach_feedback") as string)?.trim();
  if (!coach_feedback) return { error: "Le retour est obligatoire." };

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

  const { error } = await supabase
    .from("photo_updates")
    .update({
      coach_feedback,
      coach_replied_at: new Date().toISOString(),
    })
    .eq("id", photoId);

  if (error) return { error: "Erreur lors de l'envoi du retour." };

  // Notify client
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", clientId)
    .single();

  if (profile?.email && profile?.full_name) {
    notifyClientPhotoFeedback(profile.email, profile.full_name).catch(() => {});
  }

  revalidatePath(`/dashboard/coach/clients/${clientId}/photos`);
  revalidatePath("/dashboard/coach/bilan");
  revalidatePath("/dashboard/client/photos");
  return { success: true };
}
