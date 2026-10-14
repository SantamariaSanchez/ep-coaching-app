import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { loadPreviousForNames } from "@/lib/session-previous";

// « Dernière fois » d'un exercice choisi en cours de séance (remplaçant
// quand la machine est prise, exercice ajouté) : la séance l'affiche et
// pré-remplit la charge comme pour un exercice du programme.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(
    `session-previous:${guard.userId}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  const { id: sessionId } = await params;
  const names = new URL(req.url).searchParams
    .getAll("name")
    .map((n) => n.trim())
    .filter((n) => n.length > 0 && n.length <= 200)
    .slice(0, 10);
  if (names.length === 0) return NextResponse.json({ prevWeights: {}, prevSets: {} });

  const supabase = await createServerSupabase();
  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("client_id", guard.userId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  const result = await loadPreviousForNames(supabase, guard.userId, sessionId, names);
  return NextResponse.json(result);
}
