import { NextResponse } from "next/server";
import { getUser, getProfile } from "@/utils/auth";
import { getTopUrgentAlerts } from "@/lib/coach-analytics";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ alerts: [] });

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") return NextResponse.json({ alerts: [] });

  try {
    const alerts = await getTopUrgentAlerts(user.id, 3);
    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ alerts: [] });
  }
}
