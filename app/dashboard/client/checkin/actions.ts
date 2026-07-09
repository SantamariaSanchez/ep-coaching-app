"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getWeekStart, getISOWeek } from "@/utils/checkins";
import { insertNotification, getCoachUserId } from "@/utils/insert-notification";
import { revalidatePath } from "next/cache";
import { notifyCoachNewCheckin } from "@/app/actions/notifications";

type SubmitState = { error: string } | { success: true } | null;

function num(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

function txt(v: FormDataEntryValue | null): string | null {
  const s = (v as string | null)?.trim();
  return s || null;
}

export async function submitCheckin(
  prevState: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const serverClient = await createServerSupabase();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: profile } = await serverClient
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profil introuvable." };
  if (profile.role !== "client") return { error: "Accès refusé." };

  const weekStart = getWeekStart();
  const weekNumber = getISOWeek(new Date(weekStart));

  const supabase = createAdminClient();

  const { error } = await supabase.from("check_ins").insert({
    client_id: user.id,
    week_start: weekStart,
    week_number: weekNumber,
    weight: num(formData.get("weight")),
    weight_avg: num(formData.get("weight_avg")),
    // Qualitative questions
    physique_feeling: txt(formData.get("physique_feeling")),
    energy_mood: txt(formData.get("energy_mood")),
    biggest_win: txt(formData.get("biggest_win")),
    training_review: txt(formData.get("training_review")),
    nutrition_review: txt(formData.get("nutrition_review")),
    digestion_review: txt(formData.get("digestion_review")),
    work_impact: txt(formData.get("work_impact")),
    sleep_review: txt(formData.get("sleep_review")),
    upcoming_obstacles: txt(formData.get("upcoming_obstacles")),
    coach_questions: txt(formData.get("coach_questions")),
    additional_notes: txt(formData.get("additional_notes")),
    // Media links
    photo_drive_link: txt(formData.get("photo_drive_link")),
    video_drive_link: txt(formData.get("video_drive_link")),
  });

  if (error) return { error: error.message };

  const clientName = profile.full_name ?? "Un client";

  // Email via Brevo (fire-and-forget)
  notifyCoachNewCheckin(clientName).catch(() => {});

  // DB notification (fire-and-forget)
  getCoachUserId().then((coachId) => {
    if (!coachId) return;
    insertNotification({
      userId: coachId,
      type: "new_checkin",
      title: `Nouveau check-in de ${clientName}`,
      body: `${clientName} vient d'envoyer son check-in hebdomadaire (S${weekNumber}).`,
      url: `/dashboard/coach/clients/${user.id}/checkins`,
    }).catch(() => {});
  }).catch(() => {});

  revalidatePath("/dashboard/client/checkin");
  return { success: true };
}
