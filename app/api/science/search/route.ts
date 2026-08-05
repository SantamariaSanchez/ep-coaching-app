import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { searchPubMedIds, fetchPubMedSummaries } from "@/lib/pubmed";
import { cleanText, LIMITS } from "@/lib/sanitize";

// Recherche live sur PubMed pour l'onglet "Recherche" — ne touche pas à
// Supabase, c'est un simple proxy vers NCBI E-utilities pour laisser les
// membres explorer la littérature et se faire leur propre avis.
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  // La requête part vers NCBI : on la borne pour ne pas relayer une charge
  // arbitrairement longue vers un service tiers en notre nom.
  const q = cleanText(searchParams.get("q"), LIMITS.searchQuery);
  const sort = searchParams.get("sort") === "pub_date" ? "pub_date" : "relevance";
  if (!q) return NextResponse.json({ error: "Requête manquante." }, { status: 400 });

  try {
    const { ids, total } = await searchPubMedIds(q, { maxResults: 20, sort });
    const results = await fetchPubMedSummaries(ids);
    return NextResponse.json({ results, total });
  } catch {
    return NextResponse.json({ error: "Erreur lors de la recherche PubMed." }, { status: 502 });
  }
}
