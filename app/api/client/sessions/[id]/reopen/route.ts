import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { todayInParis } from "@/lib/dates";

// POST — rouvrir une séance terminée par erreur ("faut un bouton retour
// en arrière", retour direct laissé sur une séance "Pull", 2026-09-09).
// Défait précisément ce que /complete avait produit : remet la séance en
// cours (is_completed=false), retire les PR et le volume que CETTE séance
// avait générés (jamais ceux d'une autre séance du même jour, grâce à
// session_id — voir supabase/migrations/20260909e_workout_logs_session_id.sql),
// et retire les points de gamification associés. Les sets déjà tapés
// (session_sets) ne sont jamais touchés : ils restent tels quels, prêts à
// être corrigés puis re-validés.
//
// Bornée à AUJOURD'HUI seulement : rouvrir une séance d'il y a plusieurs
// semaines n'a pas de sens ("je me suis trompé" implique une erreur toute
// fraîche) et pourrait fausser un historique déjà consulté par le coach.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(`session-reopen:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return limited;

  const { id: sessionId } = await params;
  const supabase = await createServerSupabase();

  const { data: session } = await supabase
    .from("sessions")
    .select("client_id, is_completed, session_date")
    .eq("id", sessionId)
    .single();

  if (!session || (session as { client_id: string }).client_id !== guard.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sess = session as { is_completed: boolean; session_date: string };
  if (!sess.is_completed) {
    return NextResponse.json({ error: "Cette séance n'est pas terminée." }, { status: 400 });
  }
  if (sess.session_date !== todayInParis()) {
    return NextResponse.json(
      { error: "Seule une séance terminée aujourd'hui peut être rouverte." },
      { status: 400 }
    );
  }

  await Promise.all([
    supabase.from("workout_logs").delete().eq("session_id", sessionId),
    supabase.from("personal_records").delete().eq("session_id", sessionId),
    supabase
      .from("gamification_points")
      .delete()
      .eq("source_type", "session_complete")
      .eq("source_id", sessionId),
  ]);

  const { error } = await supabase
    .from("sessions")
    .update({ is_completed: false })
    .eq("id", sessionId)
    .eq("client_id", guard.userId);

  if (error) {
    console.error("reopen session error:", error);
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
