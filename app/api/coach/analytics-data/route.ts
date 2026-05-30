import { NextResponse } from "next/server";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachDashboardData } from "@/lib/coach-analytics";

// This is an expensive endpoint — only coaches can call it
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await getCoachDashboardData();
    return NextResponse.json(data);
  } catch (e) {
    console.error("analytics-data error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
