"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getWeekStart, getISOWeek } from "@/utils/checkins";
import { getCoachForClient } from "@/utils/insert-notification";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyUser } from "@/lib/notify";
import { sendBrevoEmail } from "@/utils/brevo";
import { cleanText, escapeHtml, LIMITS, safeExternalUrl } from "@/lib/sanitize";
import { awardPoints, POINTS } from "@/lib/gamification";
import { requireClient } from "@/lib/auth-guards";
import { dbErrorResult } from "@/lib/db-error";

type SubmitState = { error: string } | { success: true } | null;

function num(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

// Texte libre limité à la contrainte de la table (5 000 caractères) : une
// réponse trop longue rejetait tout le check-in au lieu d'être coupée.
function txt(v: FormDataEntryValue | null): string | null {
  return cleanText(v, LIMITS.message);
}

// Chemin de stockage envoyé par le formulaire : seulement dans le dossier de
// la personne (« <son id>/… »). Le check-in est écrit avec le client admin :
// sans ce contrôle, un chemin vers le dossier d'une autre cliente du même
// coach faisait afficher ses photos privées au coach.
function ownPath(v: FormDataEntryValue | null, userId: string): string | null {
  const p = typeof v === "string" ? v.trim() : "";
  if (!p || p.length > 300 || p.includes("..")) return null;
  return p.startsWith(`${userId}/`) ? p : null;
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
  const weekNumber = getISOWeek(new Date(`${weekStart}T12:00:00Z`));
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
    .map((v) => ownPath(v, guard.userId))
    .filter((p): p is string => !!p)
    .slice(0, 12);

  // Vidéos d'exécution : plusieurs possibles, chacune avec son exercice.
  // Chemin et libellé gardés ensemble avant de filtrer, sinon une ligne
  // vide décalait les libellés (la vidéo du développé étiquetée « Squat »).
  const rawVideoLabels = formData.getAll("video_labels");
  const videos = formData
    .getAll("video_paths")
    .map((v, i) => ({ path: ownPath(v, guard.userId), label: (typeof rawVideoLabels[i] === "string" ? (rawVideoLabels[i] as string) : "").trim().slice(0, 80) }))
    .filter((x): x is { path: string; label: string } => !!x.path)
    .slice(0, 6);
  const videoPaths = videos.map((x) => x.path);
  const videoLabels = videos.map((x) => x.label);
  // Lien affiché tel quel au coach (<a href>) : seulement http(s), jamais
  // un « javascript: » envoyé à la main en contournant le champ type="url".
  const videoLink = safeExternalUrl(formData.get("video_drive_link"));

  // Colonne entière de 1 à 10 : une valeur hors bornes rejetait tout le check-in.
  const attitudeRaw = num(formData.get("attitude_rating"));
  const attitudeRating = attitudeRaw != null && attitudeRaw >= 1 && attitudeRaw <= 10 ? Math.round(attitudeRaw) : null;
  const attitudeExplanation = txt(formData.get("attitude_explanation"));
  // Explication facultative (audit 2026-11-13) : un check-in incomplet vaut
  // mieux qu'un check-in pas envoyé.

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
    video_path: videoPaths[0] ?? null,
    ...(videoPaths.length > 0 ? { video_paths: videoPaths, video_labels: videoLabels } : {}),
    ...(videoLink ? { video_drive_link: videoLink } : {}),
  });

  if (error) return dbErrorResult(error, "checkin");

  after(() => awardPoints(guard.userId, POINTS.weekly_checkin, "Check-in hebdomadaire envoyé", "weekly_checkin", weekStart));

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
            htmlContent: `<div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;"><h2 style="color:#E01E1E;margin-top:0;">Nouveau check-in reçu</h2><p>${escapeHtml(clientName)} vient d'envoyer son check-in de la semaine ${weekNumber}.</p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app"}${url}" style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">Faire son bilan</a></div>`,
          })
        : Promise.resolve(),
    ]);
  });

  revalidatePath("/dashboard/client/checkin");
  // L'accueil affiche aussi « check-in à faire » : sans ça, le rappel restait.
  revalidatePath("/dashboard/client");
  return { success: true };
}
