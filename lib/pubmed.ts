// Client minimal pour l'API NCBI E-utilities (PubMed), utilisé pour la
// recherche live de l'onglet "Recherche" et pour le cron de synchronisation
// de l'onglet "Actualité". Pas de clé API requise (limite à 3 req/s),
// mais NCBI demande de s'identifier via les paramètres tool/email.

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const TOOL_PARAMS = "tool=ep-coaching&email=peccoux.manu@gmail.com";

export interface PubMedSummary {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  pubDate: string | null; // "YYYY-MM-DD" si dispo, sinon null
  doi: string | null;
  pmcId: string | null;
  url: string;
}

export async function searchPubMedIds(
  query: string,
  opts: { maxResults?: number; sort?: "relevance" | "pub_date"; dateFrom?: string } = {}
): Promise<{ ids: string[]; total: number }> {
  const params = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmode: "json",
    retmax: String(opts.maxResults ?? 20),
    sort: opts.sort === "pub_date" ? "pub date" : "relevance",
  });
  if (opts.dateFrom) {
    params.set("datetype", "pdat");
    params.set("mindate", opts.dateFrom);
    params.set("maxdate", "3000");
  }

  const res = await fetch(`${EUTILS_BASE}/esearch.fcgi?${params.toString()}&${TOOL_PARAMS}`);
  if (!res.ok) throw new Error(`PubMed esearch a échoué (${res.status})`);
  const data = await res.json();
  const ids: string[] = data?.esearchresult?.idlist ?? [];
  const total = Number(data?.esearchresult?.count ?? ids.length);
  return { ids, total };
}

export async function fetchPubMedSummaries(pmids: string[]): Promise<PubMedSummary[]> {
  if (pmids.length === 0) return [];

  const params = new URLSearchParams({
    db: "pubmed",
    id: pmids.join(","),
    retmode: "json",
  });
  const res = await fetch(`${EUTILS_BASE}/esummary.fcgi?${params.toString()}&${TOOL_PARAMS}`);
  if (!res.ok) throw new Error(`PubMed esummary a échoué (${res.status})`);
  const data = await res.json();
  const uids: string[] = data?.result?.uids ?? [];

  return uids.map((uid) => {
    const r = data.result[uid] ?? {};
    const articleIds: Array<{ idtype: string; value: string }> = r.articleids ?? [];
    const doi = articleIds.find((a) => a.idtype === "doi")?.value ?? null;
    const pmcId = articleIds.find((a) => a.idtype === "pmc")?.value ?? null;
    const authors: Array<{ name: string }> = r.authors ?? [];
    const authorNames = authors.slice(0, 4).map((a) => a.name);
    const authorsStr =
      authorNames.join(", ") + (authors.length > 4 ? " et al." : "");

    return {
      pmid: uid,
      title: r.title ?? "(titre indisponible)",
      authors: authorsStr || "(auteurs non renseignés)",
      journal: r.fulljournalname || r.source || "",
      pubDate: normalizePubDate(r.pubdate ?? r.sortpubdate ?? null),
      doi,
      pmcId,
      url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
    };
  });
}

function normalizePubDate(raw: string | null): string | null {
  if (!raw) return null;
  // NCBI renvoie souvent "2023 Jun 15", "2023 Jun", ou "2023/06/15 00:00".
  const cleaned = raw.split(" ")[0].replaceAll("/", "-");
  const parsed = new Date(raw.includes("/") ? cleaned : raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  const yearMatch = raw.match(/\d{4}/);
  return yearMatch ? `${yearMatch[0]}-01-01` : null;
}
