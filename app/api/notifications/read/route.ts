import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";

// Marque toutes les notifications de l'utilisateur courant comme lues —
// appelé quand la cloche est ouverte.
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = createAdminClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
