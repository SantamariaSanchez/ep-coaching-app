import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { searchNotes } from "@/lib/notes";

// Recherche dans les notes de la personne connectée (recherche globale).
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    return NextResponse.json({ results: await searchNotes(user.id, q.slice(0, 100)) });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
