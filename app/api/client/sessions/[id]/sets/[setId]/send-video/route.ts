import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { getProfile } from "@/utils/auth";
import { sendPushToUser } from "@/lib/push";

// « Envoyer au coach » (logbook en séance) : la vidéo d'une série, déjà
// rangée dans le bucket set-videos, part dans la messagerie coach/client
// existante, avec l'exercice, la série et la charge en légende. Retour direct
// du fondateur (2026-10-14) : « si je veux filmer ma série ça doit
// fonctionner, et l'envoyer automatiquement à mon coach avec un simple petit
// bouton ».
//
// Le message est inséré avec la session de la personne (pas le client
// admin) : la policy d'insertion de messages reste la seule à décider qui a
// le droit d'écrire à qui (un membre gratuit attend que son coach ouvre la
// conversation, voir 20260805l_messages_insert_anti_solicitation.sql).

const SIGNED_URL_SECONDS = 365 * 24 * 60 * 60;

function kg(v: number): string {
  return String(Math.round(v * 10) / 10).replace(".", ",");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; setId: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(
    `send-set-video:${guard.userId}`,
    PRESETS.upload.limit,
    PRESETS.upload.windowSeconds
  );
  if (limited) return limited;

  const { id: sessionId, setId } = await params;
  const body = (await req.json().catch(() => ({}))) as { position?: unknown };
  const position =
    typeof body.position === "number" && Number.isInteger(body.position) && body.position > 0 && body.position < 100
      ? body.position
      : null;

  const supabase = await createServerSupabase();

  const { data: session } = await supabase
    .from("sessions")
    .select("client_id, day_label")
    .eq("id", sessionId)
    .single();
  if (!session || (session as { client_id: string }).client_id !== guard.userId) {
    return NextResponse.json({ error: "Séance introuvable." }, { status: 403 });
  }

  const { data: setRow } = await supabase
    .from("session_sets")
    .select("id, exercise_name, set_number, weight_kg, reps_actual, rir_actual, video_url")
    .eq("id", setId)
    .eq("session_id", sessionId)
    .maybeSingle();
  const set = setRow as {
    id: string;
    exercise_name: string;
    set_number: number;
    weight_kg: number | null;
    reps_actual: number | null;
    rir_actual: number | null;
    video_url: string | null;
  } | null;
  if (!set) return NextResponse.json({ error: "Série introuvable." }, { status: 404 });
  if (!set.video_url) {
    return NextResponse.json({ error: "La vidéo n'est pas encore envoyée, réessaie dans un instant." }, { status: 409 });
  }

  const profile = await getProfile(guard.userId);
  const coachId = profile?.coach_id ?? null;
  if (!coachId || coachId === guard.userId) {
    return NextResponse.json({ error: "Tu n'as pas de coach à qui l'envoyer." }, { status: 409 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("set-videos")
    .createSignedUrl(set.video_url, SIGNED_URL_SECONDS);
  if (signError || !signed?.signedUrl) {
    console.error("send-video: signature impossible:", signError);
    return NextResponse.json({ error: "Vidéo illisible, refilme ta série." }, { status: 500 });
  }

  // Légende : « 🎥 Squat · série 2 · 100 kg × 8 · RIR 1 ».
  const parts = [set.exercise_name, `série ${position ?? set.set_number}`];
  if (set.weight_kg != null && set.reps_actual != null) parts.push(`${kg(set.weight_kg)} kg × ${set.reps_actual}`);
  else if (set.weight_kg != null) parts.push(`${kg(set.weight_kg)} kg`);
  else if (set.reps_actual != null) parts.push(`${set.reps_actual} reps`);
  if (set.rir_actual != null) parts.push(`RIR ${set.rir_actual}`);
  const caption = `🎥 ${parts.join(" · ")}`;

  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: guard.userId,
      sender_id: guard.userId,
      receiver_id: coachId,
      type: "video",
      content: caption,
      video_url: signed.signedUrl,
      is_read: false,
    })
    .select("id")
    .single();
  if (insertError || !message) {
    // 42501 : refus de la policy d'insertion (membre gratuit dont le coach
    // n'a pas encore ouvert la conversation).
    if (insertError?.code === "42501") {
      return NextResponse.json(
        { error: "Ton coach doit d'abord t'écrire pour que tu puisses lui envoyer une vidéo." },
        { status: 403 }
      );
    }
    console.error("send-video: message impossible:", insertError);
    return NextResponse.json({ error: "Envoi au coach impossible, réessaie." }, { status: 500 });
  }

  // Mémorise l'envoi (colonne ajoutée par la migration 20261014) : sans elle,
  // le bouton redevient simplement disponible au rechargement.
  const sentAt = new Date().toISOString();
  const { error: markError } = await supabase
    .from("session_sets")
    .update({ video_sent_at: sentAt })
    .eq("id", set.id)
    .eq("session_id", sessionId);
  if (markError && markError.code !== "PGRST204" && markError.code !== "42703") {
    console.error("send-video: marquage impossible:", markError);
  }

  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0] || "Ton client";
  try {
    await sendPushToUser(
      coachId,
      "EP Coaching : Nouveau message",
      `${firstName} t'a envoyé une vidéo : ${set.exercise_name}`.slice(0, 120),
      "/dashboard/coach/messages"
    );
  } catch {
    // La notification est un plus : le message est déjà dans la conversation.
  }

  return NextResponse.json({ ok: true, messageId: (message as { id: string }).id, sentAt });
}
