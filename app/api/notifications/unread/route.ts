import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ count: 0 });

  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", guard.userId)
      .is("read_at", null);

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
