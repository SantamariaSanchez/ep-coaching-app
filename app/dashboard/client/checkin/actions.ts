"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getWeekStart, getISOWeek } from "@/utils/checkins";
import { getCoachForClient } from "@/utils/insert-notification";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyUser } from "@/lib/notify";
import { sendBrevoEmail } from "@/utils/brevo";
import { escapeHtml } from "@/lib/sanitize";
import { awardPoints, POINTS } from "@/lib/gamification";
import { requireClient } from "@/lib/auth-guards";

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

  // Plus de blocage sur le jour prévu (2026-10-13) : un check-in par semaine,
  // envoyé le jour qui arrange le client.
  const weekStart = getWeekStart();
  const weekNumber = getISOWeek(new Date(weekStart));
  const { data: already } = await serverClient
    .from("check_ins")
    .select("id")
    .eq("client_id", guard.userId)
    .eq("week_start", weekStart)
    .limit(1)
    .maybeSingle();
  if (already) return { error: "Ton check-in de cette semaine est déjà envoyé." };

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

  // Coach prévenu (cloche + push + e-mail). after() : avant, ces envois
  // partaient sans être attendus et la plateforme pouvait couper la fonction
  // avant qu'ils n'aboutissent, d'où des check-ins reçus sans notification.
  const clientId = guard.userId;
  after(async () => {
    const coach = await getCoachForClient(clientId).catch(() => null);
    if (!coach) return;
    const url = `/dashboard/coach/clients/${clientId}/checkins`;
    await Promise.allSettled([
      notifyUser(coach.id, {
        type: "coach_checkin",
        title: `📋 Check-in de ${clientName}`,
        body: `Semaine ${weekNumber} reçue : poids, ressenti, victoires. À toi de faire son bilan.`,
        url,
        senderId: clientId,
      }),
      coach.email
        ? sendBrevoEmail({
            to: coach.email,
            subject: `Nouveau check-in de ${clientName}`,
            htmlContent: `<div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;"><h2 style="color:#E01E1E;margin-top:0;">Nouveau check-in reçu</h2><p>${escapeHtml(clientName)} vient d'envoyer son check-in de la semaine ${weekNumber}.</p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}${url}" style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">Faire son bilan</a></div>`,
          })
        : Promise.resolve(),
    ]);
  });

  revalidatePath("/dashboard/client/checkin");
  return { success: true };
}
