import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ count: 0 });

  try {
    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", guard.userId)
      .eq("is_read", false);

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
