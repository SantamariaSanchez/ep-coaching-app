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

  const { data, error } = await supabase
    .from("session_sets")
    .insert(set)
    .select("id")
    .single();

  if (error) {
    console.error("POST session set error:", error);
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }

  return NextResponse.json({ id: (data as { id: string }).id });
}
