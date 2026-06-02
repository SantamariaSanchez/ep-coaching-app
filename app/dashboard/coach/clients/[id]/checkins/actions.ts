"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

type ReplyState = { error: string } | { success: true } | null;

export async function replyToCheckin(
  prevState: ReplyState,
  formData: FormData
): Promise<ReplyState> {
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
