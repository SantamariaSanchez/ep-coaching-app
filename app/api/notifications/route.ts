import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";

// Client admin (pas le client lié à la session) — même fix que pour
// exercise_library/gyms/science : évite de dépendre de la config RLS sur
// la table dans le dashboard Supabase. Le filtre user_id ci-dessous fait
// office de garde-fou puisque RLS n'est plus la barrière de sécurité ici.
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ notifications: [] });

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, url, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ notifications: data ?? [] });
  } catch {
    return NextResponse.json({ notifications: [] });
  }
}
