import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActiveProgram } from "@/utils/programs";
import type { Session, SessionSet, PersonalRecord } from "@/utils/sessions";
import type { Exercise } from "@/utils/programs";

interface InitData {
  session: Session;
  exercises: Exercise[];
  prMap: Record<string, number>; // exerciseName.lower → best weight
  prevWeights: Record<string, { weight: number | null; reps: string | null; rir: number | null }>;
  existingSets: SessionSet[];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = await params;
  const supabase = await createServerSupabase();

  // Fetch session
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("client_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const sess = session as Session;

  // Fetch exercises for this day (if linked to a program)
  let exercises: Exercise[] = [];
  if (sess.program_id && sess.day_label) {
    const program = await getActiveProgram(user.id);
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
    .eq("client_id", user.id);

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

  const result: InitData = {
    session: sess,
    exercises,
    prMap,
    prevWeights,
    existingSets: (existingSets as SessionSet[]) ?? [],
  };

  return NextResponse.json(result);
}

// PATCH — update warmup validated
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = await params;
  const body = await req.json();
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("sessions")
    .update(body)
    .eq("id", sessionId)
    .eq("client_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — abandonner une séance non terminée (bouton "Annuler la séance").
// Ne touche jamais une séance déjà validée : is_completed=false uniquement,
// pour ne jamais effacer un historique réel par erreur.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = await params;
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("client_id", user.id)
    .eq("is_completed", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
