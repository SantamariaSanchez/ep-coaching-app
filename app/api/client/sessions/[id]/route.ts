import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { getActiveProgram } from "@/utils/programs";
import type { Session, SessionSet, PersonalRecord } from "@/utils/sessions";
import type { Exercise } from "@/utils/programs";

interface InitData {
  session: Session;
  exercises: Exercise[];
  prMap: Record<string, number>; // exerciseName.lower → best weight
  prevWeights: Record<string, { weight: number | null; reps: string | null; rir: number | null }>;
  existingSets: SessionSet[];
  // exerciseName.lower → conseils réels + vidéo d'exemple, tirés de la
  // bibliothèque d'exercices (exercise_library) plutôt que d'un petit
  // dictionnaire générique — voir lib/execution-tips.ts pour le fallback.
  libraryByName: Record<string, { instructions: string | null; video_url: string | null }>;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const { id: sessionId } = await params;
  const supabase = await createServerSupabase();

  // Fetch session
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("client_id", guard.userId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const sess = session as Session;

  // Fetch exercises for this day (if linked to a program)
  let exercises: Exercise[] = [];
  if (sess.program_id && sess.day_label) {
    const program = await getActiveProgram(guard.userId);
    if (program) {
      const day = program.days.find((d) => d.day_label === sess.day_label);
      exercises = day?.exercises ?? [];
    }
  }

  // Fetch existing sets for this session
  const { data: existingSets } = await supabase
    .from("session_sets")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at");

  // Fetch personal records
  const { data: prs } = await supabase
    .from("personal_records")
    .select("exercise_name, weight_kg")
    .eq("client_id", guard.userId);

  const prMap: Record<string, number> = {};
  for (const r of (prs as PersonalRecord[]) ?? []) {
    const key = r.exercise_name.toLowerCase();
    if (!(key in prMap) || r.weight_kg > prMap[key]) {
      prMap[key] = r.weight_kg;
    }
  }

  // Fetch previous weights for each exercise
  const prevWeights: Record<string, { weight: number | null; reps: string | null; rir: number | null }> = {};
  if (exercises.length > 0) {
    const exerciseNames = exercises.map((e) => e.name);
    const { data: lastSets } = await supabase
      .from("session_sets")
      .select("exercise_name, weight_kg, reps_actual, rir_actual, created_at")
      .in("exercise_name", exerciseNames)
      .neq("session_id", sessionId) // exclude current session
      .order("created_at", { ascending: false });

    for (const set of (lastSets as SessionSet[]) ?? []) {
      const key = set.exercise_name.toLowerCase();
      if (!(key in prevWeights)) {
        prevWeights[key] = {
          weight: set.weight_kg,
          reps: set.reps_actual != null ? String(set.reps_actual) : null,
          rir: set.rir_actual,
        };
      }
    }
  }

  // Conseils + vidéo d'exemple par exercice, tirés de la bibliothèque —
  // match par nom (pas de FK entre les exercices d'un programme et la
  // bibliothèque), insensible à la casse.
  const libraryByName: Record<string, { instructions: string | null; video_url: string | null }> = {};
  if (exercises.length > 0) {
    const { data: libraryRows } = await supabase
      .from("exercise_library")
      .select("name, instructions, video_url");
    for (const row of (libraryRows as { name: string; instructions: string | null; video_url: string | null }[]) ?? []) {
      libraryByName[row.name.toLowerCase()] = { instructions: row.instructions, video_url: row.video_url };
    }
  }

  const result: InitData = {
    session: sess,
    exercises,
    prMap,
    prevWeights,
    existingSets: (existingSets as SessionSet[]) ?? [],
    libraryByName,
  };

  return NextResponse.json(result);
}

// PATCH — update warmup validated
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(`session-patch:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return limited;

  const { id: sessionId } = await params;
  const body = await req.json();
  const supabase = await createServerSupabase();

  // Allowlist explicite plutôt que d'écrire le body tel quel : sans ça, un
  // body forgé pourrait réassigner client_id (ou toute autre colonne) de la
  // séance au lieu de se limiter au warmup.
  const update: Record<string, unknown> = {};
  if (body.warmup_validated !== undefined) update.warmup_validated = body.warmup_validated;
  if (body.warmup_duration_seconds !== undefined) update.warmup_duration_seconds = body.warmup_duration_seconds;

  const { error } = await supabase
    .from("sessions")
    .update(update)
    .eq("id", sessionId)
    .eq("client_id", guard.userId);

  // Masterclass Axe P : error.message (texte brut Postgres/Supabase, peut
  // révéler des noms de colonnes ou de contraintes) partait tel quel au
  // client au lieu d'un message générique — loggé côté serveur à la place.
  if (error) {
    console.error("PATCH session error:", error);
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE — abandonner une séance non terminée (bouton "Annuler la séance").
// Ne touche jamais une séance déjà validée : is_completed=false uniquement,
// pour ne jamais effacer un historique réel par erreur.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(`session-delete:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return limited;

  const { id: sessionId } = await params;
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("client_id", guard.userId)
    .eq("is_completed", false);

  if (error) {
    console.error("DELETE session error:", error);
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
