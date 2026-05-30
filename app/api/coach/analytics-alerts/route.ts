import { NextResponse } from "next/server";
import { getUser, getProfile } from "@/utils/auth";
import { getTopUrgentAlerts } from "@/lib/coach-analytics";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ count: 0 });

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") return NextResponse.json({ count: 0 });

  try {
    // Fetch all alerts lightly — reuse getTopUrgentAlerts with high limit
    const alerts = await getTopUrgentAlerts(50);
    const highCount = alerts.filter((a) => a.alert.severity === "high").length;
    return NextResponse.json({ count: highCount });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
