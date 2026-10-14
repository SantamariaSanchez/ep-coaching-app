import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

// PATCH — completer un set deja enregistre : duree de repos, et chemin de la
// video filmee pendant la serie. La duree de repos n'est connue qu'a la
// fermeture du chrono, donc APRES l'enregistrement du set. Faute de cette route, la colonne
// rest_duration_seconds n'a jamais ete remplie une seule fois en base
// (elle est pourtant exportee dans le CSV du logbook, toujours vide).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; setId: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(
    `session-set-patch:${guard.userId}`,
    600,
    600
  );
  if (limited) return limited;

  const { id: sessionId, setId } = await params;
  const body = await req.json();

  const supabase = await createServerSupabase();

  const { data: session } = await supabase
    .from("sessions")
    .select("client_id")
    .eq("id", sessionId)
    .single();

  if (!session || (session as { client_id: string }).client_id !== guard.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Allowlist stricte, meme discipline que le POST : rien d'autre que la
  // duree de repos et la video ne peut etre reecrit par cette route.
  const update: Record<string, unknown> = {};
  if (typeof body.rest_duration_seconds === "number") {
    update.rest_duration_seconds = Math.max(0, Math.min(7200, Math.round(body.rest_duration_seconds)));
  }
  // Vidéo de la série (bouton caméra du logbook) : uniquement un chemin du
  // bucket set-videos rangé dans le dossier de la personne elle-même, la
  // même règle que la policy de stockage (premier dossier = son id).
  if (
    typeof body.video_url === "string" &&
    body.video_url.length <= 500 &&
    body.video_url.startsWith(`${guard.userId}/`) &&
    !body.video_url.includes("..")
  ) {
    update.video_url = body.video_url;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("session_sets")
    .update(update)
    .eq("id", setId)
    .eq("session_id", sessionId);

  if (error) {
    console.error("PATCH session set error:", error);
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; setId: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(`session-set-delete:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return limited;

  const { id: sessionId, setId } = await params;

  const supabase = await createServerSupabase();

  // Verify the session belongs to this user before touching its sets.
  const { data: session } = await supabase
    .from("sessions")
    .select("client_id")
    .eq("id", sessionId)
    .single();

  if (!session || (session as { client_id: string }).client_id !== guard.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("session_sets")
    .delete()
    .eq("id", setId)
    .eq("session_id", sessionId);

  if (error) {
    console.error("DELETE session set error:", error);
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
