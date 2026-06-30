import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ count: 0 });

  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
