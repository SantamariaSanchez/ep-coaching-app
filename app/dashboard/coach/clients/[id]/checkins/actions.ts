"use server";
import { requireOwnClient } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { safeExternalUrl } from "@/lib/sanitize";
import { notifyUser } from "@/lib/notify";

// Aperçu du retour dans la notification : assez pour donner envie d'ouvrir,
// jamais le texte entier (un retour de check-in peut faire plusieurs paragraphes).
function notificationExcerpt(text: string, max = 90): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

type ReplyState = { error: string } | { success: true } | null;

export async function replyToCheckin(
  prevState: ReplyState,
  formData: FormData
): Promise<ReplyState> {
  const checkinId = (formData.get("checkin_id") as string | null) ?? "";
  const clientId = (formData.get("client_id") as string | null) ?? "";
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };
  const coachNotes = ((formData.get("coach_notes") as string | null) ?? "").trim();
  const coachRating = formData.get("coach_rating") as string | null;

  if (!checkinId || !coachNotes) {
    return { error: "Le retour et la note sont requis." };
  }

  const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

  // Lu avant l'écriture pour distinguer une première réponse d'une
  // correction du retour déjà envoyé (la notification n'a pas le même texte),
  // et pour refuser un check-in qui n'appartient pas à ce membre.
  const { data: existing, error: readError } = await supabase
    .from("check_ins")
    .select("id, coach_replied_at")
    .eq("id", checkinId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (readError) {
    console.error("replyToCheckin read error:", readError.message);
    return { error: "Erreur lors de l'envoi du retour, réessaie." };
  }
  if (!existing) return { error: "Check-in introuvable pour ce membre." };

  const { error } = await supabase
    .from("check_ins")
    .update({
      coach_notes: coachNotes,
      coach_rating: coachRating ? parseInt(coachRating, 10) : null,
      coach_replied_at: new Date().toISOString(),
    })
    .eq("id", checkinId)
    .eq("client_id", clientId);

  if (error) {
    console.error("replyToCheckin update error:", error.message);
    return { error: "Erreur lors de l'envoi du retour, réessaie." };
  }

  // Avant, la réponse était enregistrée sans que le membre en soit jamais
  // prévenu : il ne découvrait le retour de son coach que s'il revenait de
  // lui-même sur la page check-in. Cloche in-app + push (catégorie
  // "coaching", donc respecte ses préférences). Une notification par envoi,
  // jamais en boucle. after() : envoyée après la réponse, sans ralentir le
  // coach, mais garantie de s'exécuter jusqu'au bout sur Vercel (une simple
  // promesse non attendue peut être coupée à la fin de la fonction).
  const isUpdate = existing.coach_replied_at != null;
  const coachId = guard.userId;
  after(() =>
    notifyUser(clientId, {
      type: isUpdate ? "client_checkin_reply_updated" : "client_checkin_reply",
      title: isUpdate ? "Ton coach a mis à jour son retour" : "Ton coach a répondu à ton check-in",
      body: notificationExcerpt(coachNotes),
      url: "/dashboard/client/checkin",
      senderId: coachId,
    }).catch(() => {})
  );

  revalidatePath(`/dashboard/coach/clients/${clientId}/checkins`);
  // La CheckinCard est aussi rendue dans l'onglet Check-ins de la fiche
  // membre et dans la boîte de réception coach : sans ça, ces deux vues
  // continuaient d'afficher le check-in comme "à traiter".
  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  revalidatePath("/dashboard/coach/inbox");
  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/client/checkin");
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

// Alternative à attachCoachVideo ci-dessus : lien externe (ScreenPal,
// YouTube, Vimeo...) plutôt qu'un enregistrement natif dans l'appli —
// demande explicite du 2026-08-15, même principe que
// exercise_corrections.coach_video_link côté corrections.
export async function attachCoachVideoLink(
  checkinId: string,
  clientId: string,
  videoLink: string
): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const safeLink = safeExternalUrl(videoLink);
  if (!safeLink) return { error: "Lien invalide." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("check_ins")
    .update({ coach_video_link: safeLink })
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

  // Item 22 : notes horodatées posées sur la vidéo du CLIENT, sérialisées en
  // JSON par le formulaire. On ignore silencieusement toute entrée mal
  // formée plutôt que de faire échouer l'envoi du retour pour ça.
  let video_annotations: { timestamp_seconds: number; note: string }[] = [];
  try {
    const parsed = JSON.parse((formData.get("video_annotations") as string) || "[]");
    if (Array.isArray(parsed)) {
      video_annotations = parsed
        .filter(
          (a): a is { timestamp_seconds: number; note: string } =>
            !!a && typeof a.note === "string" && a.note.trim().length > 0 && Number.isFinite(a.timestamp_seconds)
        )
        .map((a) => ({ timestamp_seconds: Math.max(0, Math.floor(a.timestamp_seconds)), note: a.note.trim().slice(0, 300) }));
    }
  } catch {
    video_annotations = [];
  }

  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("exercise_corrections")
    .update({
      coach_feedback,
      coach_video_path,
      video_annotations: video_annotations.length > 0 ? video_annotations : null,
      status: "answered",
      answered_at: new Date().toISOString(),
    })
    .eq("id", correctionId)
    .eq("client_id", clientId)
    .select("exercise_name")
    .maybeSingle();

  if (error) return { error: "Erreur lors de l'envoi du retour." };
  // Aucune ligne touchée : la correction n'existe pas ou n'appartient pas à
  // ce membre. Avant, l'action répondait "succès" sans rien avoir écrit.
  if (!updated) return { error: "Demande de correction introuvable pour ce membre." };

  // Même trou que pour les check-ins : le membre qui avait filmé son
  // exercice n'était jamais prévenu que la correction était prête.
  const exerciseName = (updated.exercise_name as string | null)?.trim();
  const coachId = guard.userId;
  after(() =>
    notifyUser(clientId, {
      type: "client_correction_answered",
      title: exerciseName ? `Ton coach a corrigé ton ${exerciseName}` : "Ton coach a corrigé ton exercice",
      body: notificationExcerpt(coach_feedback),
      url: "/dashboard/client/program",
      senderId: coachId,
    }).catch(() => {})
  );

  revalidatePath(`/dashboard/coach/clients/${clientId}/checkins`);
  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  revalidatePath("/dashboard/coach/inbox");
  revalidatePath(`/dashboard/coach/clients/${clientId}/program`);
  revalidatePath("/dashboard/client/program");
  return { success: true };
}
