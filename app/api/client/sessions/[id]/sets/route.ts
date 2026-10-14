import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  // Limite volontairement large : on enregistre une serie par set effectue,
  // une grosse seance en produit plusieurs dizaines.
  const limited = await enforceRateLimit(
    `session-sets:${guard.userId}`,
    600,
    600
  );
  if (limited) return limited;

  const { id: sessionId } = await params;
  const body = await req.json();

  const supabase = await createServerSupabase();

  // Verify the session belongs to this user
  const { data: session } = await supabase
    .from("sessions")
    .select("client_id")
    .eq("id", sessionId)
    .single();

  if (!session || (session as { client_id: string }).client_id !== guard.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Masterclass Axe P : { ...body, session_id: sessionId } écrasait bien
  // session_id, mais laissait passer n'importe quel autre champ du body tel
  // quel (y compris id, qui aurait sinon écrasé le défaut généré par la
  // base). Allowlist explicite des champs qu'un client logue légitimement,
  // même discipline que updateMyProfile (utils/profile-actions.ts).
  const set: Record<string, unknown> = { session_id: sessionId };
  const allowedFields = [
    "exercise_id", "exercise_name", "muscle_group", "set_number",
    "reps_target", "reps_actual", "weight_kg", "previous_weight_kg",
    "rir_target", "rir_actual", "standardization_score",
    "rest_duration_seconds", "is_pr", "notes", "video_url",
  ] as const;
  for (const field of allowedFields) {
    if (body[field] !== undefined) set[field] = body[field];
  }
  // Détail d'une série à technique (myo-reps, rest-pause, dégressive...),
  // voir lib/live-session.ts. Petit objet, jamais plus de quelques Ko.
  let details: unknown = undefined;
  if (body.details !== undefined) {
    const ok =
      body.details === null ||
      (typeof body.details === "object" && !Array.isArray(body.details) && JSON.stringify(body.details).length <= 8192);
    if (ok) details = body.details;
  }
  if (details !== undefined) set.details = details;
  // Repli si la colonne details n'existe pas encore (migration 20261014
  // pas passée) : le détail part en clair dans la note de la série.
  const detailsNote = typeof body.details_note === "string" ? body.details_note.slice(0, 300) : null;
  const isMissingColumn = (e: { code?: string } | null) => !!e && (e.code === "PGRST204" || e.code === "42703");
  const withoutDetails = () => {
    const copy = { ...set };
    delete copy.details;
    if (detailsNote) {
      const base = typeof copy.notes === "string" && copy.notes ? `${copy.notes} ` : "";
      copy.notes = `${base}${detailsNote}`.slice(0, 2000);
    }
    return copy;
  };

  // Un set est identifie de facon unique par (seance, exercice, numero de
  // serie). Sans ce garde-fou, chaque re-envoi du meme set creait une ligne
  // de plus : un double-tap sur "Valider le set" en salle (les deux POST
  // partent a ~1s d'ecart), une revalidation apres correction, ou la meme
  // seance rouverte dans un autre onglet. On retrouvait donc en base des
  // series strictement identiques en double, comptees deux fois dans le
  // volume, le recap et l'historique de l'exercice.
  const exerciseName = set.exercise_name;
  const setNumber = set.set_number;
  const canDeduplicate =
    typeof exerciseName === "string" && exerciseName.length > 0 && setNumber != null;

  if (canDeduplicate) {
    const { data: existing } = await supabase
      .from("session_sets")
      .select("id")
      .eq("session_id", sessionId)
      .eq("exercise_name", exerciseName)
      .eq("set_number", setNumber)
      // La plus RECENTE : c'est la derniere correction saisie, et c'est
      // aussi celle que le client affiche et que la migration de nettoyage
      // conserve. Prendre la plus ancienne aurait fait diverger les trois.
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const existingId = (existing as { id: string }).id;
      let { error: updateError } = await supabase
        .from("session_sets")
        .update(set)
        .eq("id", existingId)
        .eq("session_id", sessionId);
      if (isMissingColumn(updateError) && details !== undefined) {
        ({ error: updateError } = await supabase
          .from("session_sets")
          .update(withoutDetails())
          .eq("id", existingId)
          .eq("session_id", sessionId));
      }

      if (updateError) {
        console.error("POST session set (update) error:", updateError);
        return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
      }
      return NextResponse.json({ id: existingId });
    }
  }

  let { data, error } = await supabase
    .from("session_sets")
    .insert(set)
    .select("id")
    .single();
  if (isMissingColumn(error) && details !== undefined) {
    ({ data, error } = await supabase
      .from("session_sets")
      .insert(withoutDetails())
      .select("id")
      .single());
  }

  if (error) {
    // 23505 = violation de l'index unique (session, exercice, numero) : deux
    // requetes parties en meme temps, l'autre a gagne la course. On recupere
    // la ligne gagnante et on y ecrit nos valeurs plutot que d'echouer.
    if (error.code === "23505" && canDeduplicate) {
      const { data: raced } = await supabase
        .from("session_sets")
        .select("id")
        .eq("session_id", sessionId)
        .eq("exercise_name", exerciseName)
        .eq("set_number", setNumber)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (raced) {
        const racedId = (raced as { id: string }).id;
        const { error: racedError } = await supabase.from("session_sets").update(set).eq("id", racedId);
        if (isMissingColumn(racedError)) {
          await supabase.from("session_sets").update(withoutDetails()).eq("id", racedId);
        }
        return NextResponse.json({ id: racedId });
      }
    }
    console.error("POST session set error:", error);
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }

  return NextResponse.json({ id: (data as { id: string }).id });
}
