import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth-guards";
import { getOpenQuestionsCount } from "@/utils/community";

export async function GET() {
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const count = await getOpenQuestionsCount();
  return NextResponse.json({ count });
}
