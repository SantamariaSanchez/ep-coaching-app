import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { cleanText, LIMITS } from "@/lib/sanitize";



// Note libre persistante par exercice (Logbook, "Ton exercice") — retour
// direct 2026-09-17 : "vérifie que c'est bien une note qui reste et qui
// n'est pas là que sur cette séance mais toujours toujours, et qu'on peut
// modifier en permanence". Une seule ligne par (client, exercice), voir
// migration 20260917e_client_exercise_notes.sql. `client_exercise_notes`
// contourne RLS via createAdminClient comme le reste des routes client,
// le guard ci-dessous fait tout le contrôle d'accès.
export async function PATCH(req: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(`exercise-note:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as { exercise_name?: string; note?: string };
  const exerciseName = cleanText(body.exercise_name, 200);
  if (!exerciseName) {
    return NextResponse.json({ error: "exercise_name manquant" }, { status: 400 });
  }
  const note = cleanText(body.note, LIMITS.note) ?? "";

  const admin = createAdminClient();
  const { error } = await admin
    .from("client_exercise_notes")
    .upsert(
      { client_id: guard.userId, exercise_name: exerciseName, note, updated_at: new Date().toISOString() },
      { onConflict: "client_id,exercise_name" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
