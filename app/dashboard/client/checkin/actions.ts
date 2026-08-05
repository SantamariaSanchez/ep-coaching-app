"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getWeekStart, getISOWeek } from "@/utils/checkins";
import { insertNotification, getCoachForClient } from "@/utils/insert-notification";
import { revalidatePath } from "next/cache";
import { notifyCoachNewCheckin } from "@/app/actions/notifications";
import { awardPoints, POINTS } from "@/lib/gamification";
import { requireClient } from "@/lib/auth-guards";

type SubmitState = { error: string } | { success: true } | null;

const DAY_NAMES = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function num(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

function txt(v: FormDataEntryValue | null): string | null {
  const s = (v as string | null)?.trim();
  return s || null;
}

// 1 = lundi ... 7 = dimanche — Date.getDay() renvoie 0 pour dimanche, d'où
// le décalage pour rester cohérent avec profiles.checkin_day et les semaines
// lundi→dimanche déjà utilisées par getWeekStart/getISOWeek.
function isoWeekday(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

export async function submitCheckin(
  prevState: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  // requireClient() valide l'identité, le rôle ET la force de session
  // (2FA exigée si le compte l'a activée) — l'insertion se faisant ensuite
  // via le client admin, qui court-circuite la RLS.
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  const serverClient = await createServerSupabase();
  const { data: profile } = await serverClient
    .from("profiles")
    .select("full_name, checkin_day")
    .eq("id", guard.userId)
    .single();

  if (!profile) return { error: "Profil introuvable." };

  const today = new Date();
  const checkinDay = (profile as { checkin_day?: number }).checkin_day ?? 1;
  if (isoWeekday(today) !== checkinDay) {
    return {
      error: `Ton jour de check-in est le ${DAY_NAMES[checkinDay]}. Reviens ce jour-là pour l'envoyer.`,
    };
  }

  const weekStart = getWeekStart();
  const weekNumber = getISOWeek(new Date(weekStart));

  const photoPaths = formData
    .getAll("photo_paths")
    .map((v) => (v as string).trim())
    .filter(Boolean);

  const attitudeRating = num(formData.get("attitude_rating"));
  const attitudeExplanation = txt(formData.get("attitude_explanation"));
  if (attitudeRating != null && (attitudeRating <= 3 || attitudeRating >= 8) && !attitudeExplanation) {
    return { error: "Explique ta note d'attitude. C'est requis quand elle est très basse ou très haute." };
  }

  const feedbackFormat = txt(formData.get("preferred_feedback_format"));

  const supabase = createAdminClient();

  const { error } = await supabase.from("check_ins").insert({
    client_id: guard.userId,
    week_start: weekStart,
    week_number: weekNumber,
    weight: num(formData.get("weight")),
    weight_avg: num(formData.get("weight_avg")),
    // Bilan de la semaine
    attitude_rating: attitudeRating,
    attitude_explanation: attitudeExplanation,
    biggest_win: txt(formData.get("biggest_win")),
    biggest_win_2: txt(formData.get("biggest_win_2")),
    biggest_win_3: txt(formData.get("biggest_win_3")),
    training_review: txt(formData.get("training_review")),
    work_impact: txt(formData.get("work_impact")),
    improvement_reflection: txt(formData.get("improvement_reflection")),
    entourage_support: txt(formData.get("entourage_support")),
    upcoming_obstacles: txt(formData.get("upcoming_obstacles")),
    plan_adherence_feedback: txt(formData.get("plan_adherence_feedback")),
    preferred_feedback_format:
      feedbackFormat === "ecrit" || feedbackFormat === "vocal" || feedbackFormat === "video"
        ? feedbackFormat
        : null,
    // Médias — déjà uploadés côté client (voir CheckinForm), on ne reçoit ici
    // que les chemins de stockage, jamais les fichiers eux-mêmes.
    photo_paths: photoPaths.length > 0 ? photoPaths : null,
    video_path: txt(formData.get("video_path")),
  });

  if (error) return { error: error.message };

  awardPoints(guard.userId, POINTS.weekly_checkin, "Check-in hebdomadaire envoyé", "weekly_checkin", weekStart);

  const clientName = profile.full_name ?? "Un client";

  // Email via Brevo (fire-and-forget)
  notifyCoachNewCheckin(clientName, guard.userId).catch(() => {});

  // DB notification (fire-and-forget)
  getCoachForClient(guard.userId).then((coach) => {
    if (!coach) return;
    insertNotification({
      userId: coach.id,
      type: "new_checkin",
      title: `Nouveau check-in de ${clientName}`,
      body: `${clientName} vient d'envoyer son check-in hebdomadaire (S${weekNumber}).`,
      url: `/dashboard/coach/clients/${guard.userId}/checkins`,
      senderId: guard.userId,
    }).catch(() => {});
  }).catch(() => {});

  revalidatePath("/dashboard/client/checkin");
  return { success: true };
}
