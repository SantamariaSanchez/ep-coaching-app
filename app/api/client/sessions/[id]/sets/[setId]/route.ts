import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

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
