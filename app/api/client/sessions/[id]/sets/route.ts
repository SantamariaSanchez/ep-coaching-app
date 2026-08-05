import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

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

  // session_id vient toujours du param d'URL déjà vérifié ci-dessus, jamais
  // du body — sinon un body { session_id: "<autre session>" } écraserait
  // cette valeur via le spread et permettrait d'insérer une série dans la
  // séance d'un autre utilisateur.
  const { data, error } = await supabase
    .from("session_sets")
    .insert({ ...body, session_id: sessionId })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: (data as { id: string }).id });
}
