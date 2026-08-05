import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";

// Marque toutes les notifications de l'utilisateur courant comme lues —
// appelé quand la cloche est ouverte.
export async function POST() {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  try {
    const supabase = createAdminClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", guard.userId)
      .is("read_at", null);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
