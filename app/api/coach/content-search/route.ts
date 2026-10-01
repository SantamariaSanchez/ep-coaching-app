import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { cleanText, LIMITS } from "@/lib/sanitize";
import { fuzzyMatch, fuzzyMatchAny } from "@/lib/fuzzy-search";

// Recherche globale (palette, loupe) dans le Studio créatif du coach : ses
// scripts (titre, hook, pilier, texte) et ses idées de contenu. Jusqu'ici la
// loupe trouvait clients, notes et bibliothèques, mais un script déjà écrit
// restait introuvable sans ouvrir Studio puis l'onglet Scripts à la main
// (reste noté dans LANCEMENT.md, semaine 1). Uniquement les contenus du coach
// connecté (filtre coach_id), jamais ceux d'un autre coach.
export interface ContentSearchResult {
  id: string;
  label: string;
  kind: "script" | "idee";
}

export async function GET(req: Request) {
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ results: [] }, { status: 403 });

  const q = cleanText(new URL(req.url).searchParams.get("q"), LIMITS.searchQuery)?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  try {
    const admin = createAdminClient();
    const [{ data: scripts }, { data: ideas }] = await Promise.all([
      admin
        .from("coach_scripts")
        .select("id, title, hook, pillar, content")
        .eq("coach_id", guard.userId)
        .order("updated_at", { ascending: false })
        .limit(500),
      admin
        .from("content_ideas")
        .select("id, title, notes")
        .eq("coach_id", guard.userId)
        .order("updated_at", { ascending: false })
        .limit(500),
    ]);

    // Un titre qui correspond passe devant un mot trouvé au fond du texte.
    const byTitleFirst = <T extends { title: string }>(rows: T[]) => [
      ...rows.filter((r) => fuzzyMatch(r.title, q)),
      ...rows.filter((r) => !fuzzyMatch(r.title, q)),
    ];

    const matchedScripts = byTitleFirst(
      (scripts ?? []).filter((s) => fuzzyMatchAny([s.title, s.hook, s.pillar, s.content], q))
    ).slice(0, 5);
    const matchedIdeas = byTitleFirst(
      (ideas ?? []).filter((i) => fuzzyMatchAny([i.title, i.notes], q))
    ).slice(0, 4);

    const results: ContentSearchResult[] = [
      ...matchedScripts.map((s) => ({ id: s.id, label: s.title, kind: "script" as const })),
      ...matchedIdeas.map((i) => ({ id: i.id, label: i.title, kind: "idee" as const })),
    ];
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
