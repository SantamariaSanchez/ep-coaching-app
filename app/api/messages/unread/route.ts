import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ count: 0 });

  try {
    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
