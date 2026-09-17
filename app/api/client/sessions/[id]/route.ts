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
  // Retour direct 2026-09-17 ("j'arrive sur mon exo et je vois ce que j'ai
  // fait la dernière fois, pas juste un set mais TOUS les sets") :
  // prevWeights ne garde qu'UN set (le plus récent créé, toutes séances
  // confondues) — utile pour la suggestion de charge (suggestNextWeight),
  // mais illisible comme "historique". prevSets regroupe plutôt TOUS les
  // sets de la séance précédente la plus récente où cet exercice a été
  // fait, dans l'ordre (set_number croissant).
  prevSets: Record<string, { weight: number | null; reps: string | null; rir: number | null }[]>;
  existingSets: SessionSet[];
  // Note libre persistante par exercice, clé = nom exact (pas .lower, même
  // convention que accessoriesByName) — voir client_exercise_notes.
  exerciseNotes: Record<string, string>;
  // exerciseName.lower → conseils réels + vidéo d'exemple, tirés de la
  // bibliothèque d'exercices (exercise_library) plutôt que d'un petit
  // dictionnaire générique — voir lib/execution-tips.ts pour le fallback.
  libraryByName: Record<string, { instructions: string | null; video_url: string | null }>;
  // "À prévoir" (lib/session-accessories.ts) : bagage choisi explicitement
  // par exercice (exercise_library.accessories), clé exacte (pas .lower,
  // accessoriesForSession matche sur le nom affiché tel quel).
  accessoriesByName: Record<string, string[]>;
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
  // Retour direct 2026-09-17 : voir le commentaire sur InitData.prevSets.
  // Un seul groupe par exercice, celui de la séance la plus récente où il a
  // été fait (session_id du tout premier set rencontré, puisque lastSets
  // est trié par created_at décroissant), pas juste son dernier set.
  const prevSets: Record<string, { weight: number | null; reps: string | null; rir: number | null }[]> = {};
  const latestSessionIdByExercise: Record<string, string> = {};
  const prevSetsUnsorted: Record<string, { setNumber: number; weight: number | null; reps: string | null; rir: number | null }[]> = {};
  if (exercises.length > 0) {
    const exerciseNames = exercises.map((e) => e.name);
    const { data: lastSets } = await supabase
      .from("session_sets")
      .select("exercise_name, weight_kg, reps_actual, rir_actual, created_at, session_id, set_number")
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
      if (!(key in latestSessionIdByExercise)) {
        latestSessionIdByExercise[key] = set.session_id;
      }
      if (set.session_id === latestSessionIdByExercise[key]) {
        (prevSetsUnsorted[key] ??= []).push({
          setNumber: set.set_number,
          weight: set.weight_kg,
          reps: set.reps_actual != null ? String(set.reps_actual) : null,
          rir: set.rir_actual,
        });
      }
    }
    for (const [key, rows] of Object.entries(prevSetsUnsorted)) {
      prevSets[key] = rows
        .sort((a, b) => a.setNumber - b.setNumber)
        .map(({ weight, reps, rir }) => ({ weight, reps, rir }));
    }
  }

  // Conseils + vidéo d'exemple par exercice, tirés de la bibliothèque —
  // match par nom (pas de FK entre les exercices d'un programme et la
  // bibliothèque), insensible à la casse.
  const libraryByName: Record<string, { instructions: string | null; video_url: string | null }> = {};
  const accessoriesByName: Record<string, string[]> = {};
  if (exercises.length > 0) {
    const { data: libraryRows } = await supabase
      .from("exercise_library")
      .select("name, instructions, video_url, accessories");
    for (const row of (libraryRows as { name: string; instructions: string | null; video_url: string | null; accessories: string[] | null }[]) ?? []) {
      libraryByName[row.name.toLowerCase()] = { instructions: row.instructions, video_url: row.video_url };
      accessoriesByName[row.name] = row.accessories ?? [];
    }
  }

  // Note libre persistante par exercice (Logbook, "Ton exercice") — retour
  // direct 2026-09-17 : avant, cette note vivait en localStorage clée par
  // sessionId, donc remise à zéro à chaque nouvelle séance. Une seule ligne
  // par (client, exercice), indépendante de la séance en cours (voir
  // migration 20260917e_client_exercise_notes.sql).
  const exerciseNotes: Record<string, string> = {};
  if (exercises.length > 0) {
    const { data: noteRows } = await supabase
      .from("client_exercise_notes")
      .select("exercise_name, note")
      .eq("client_id", guard.userId);
    for (const row of (noteRows as { exercise_name: string; note: string }[]) ?? []) {
      exerciseNotes[row.exercise_name] = row.note;
    }
  }

  const result: InitData = {
    session: sess,
    exercises,
    prMap,
    prevWeights,
    prevSets,
    existingSets: (existingSets as SessionSet[]) ?? [],
    libraryByName,
    accessoriesByName,
    exerciseNotes,
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
