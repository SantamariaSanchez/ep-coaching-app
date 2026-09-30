import { NextResponse } from "next/server";
import { getUser, getProfile } from "@/utils/auth";
import { getQuickAnswers } from "@/lib/quick-answers";

// Réponses rapides de la recherche, pour la personne connectée uniquement.
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ answers: [] }, { status: 401 });
  const profile = await getProfile(user.id);
  try {
    const answers = await getQuickAnswers(user.id, profile?.role === "coach" ? "coach" : "client", profile?.is_platform_owner === true);
    return NextResponse.json({ answers }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (e) {
    console.error("quick-answers error:", e);
    return NextResponse.json({ answers: [] });
  }
}
