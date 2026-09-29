import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink, AlertTriangle } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { getSocialDashboard } from "@/lib/social/queries";
import { windsorConfigured } from "@/lib/social/windsor";
import { PLATFORM_LABELS, type Platform } from "@/lib/social/platforms";
import SocialCharts from "@/components/social/SocialCharts";
import SyncNowButton from "@/components/social/SyncNowButton";
import PostScriptLink from "@/components/social/PostScriptLink";

export const dynamic = "force-dynamic";
// La synchro manuelle ("Synchroniser maintenant") tourne dans une action
// serveur de cette page : il lui faut le temps d'interroger Windsor.
export const maxDuration = 300;

const PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "threads"];
const PERIODS = [7, 30, 90, 365];
const SORTS = [
  { key: "vues", label: "Vues" },
  { key: "engagement", label: "Engagement" },
  { key: "recent", label: "Récentes" },
] as const;
const DIMENSIONS: Record<string, string> = {
  age: "Âge",
  genre: "Genre",
  pays: "Pays",
  ville: "Villes",
  heure: "Heures d'activité des abonnés",
  age_genre: "Âge et genre",
  source_trafic: "Sources de trafic",
  fonction: "Fonction",
  seniorite: "Séniorité",
  secteur: "Secteur",
  region: "Région",
  taille_entreprise: "Taille d'entreprise",
  vues_fonction: "Visiteurs par fonction",
  vues_seniorite: "Visiteurs par séniorité",
  vues_secteur: "Visiteurs par secteur",
  vues_pays: "Visiteurs par pays",
  vues_taille_entreprise: "Visiteurs par taille d'entreprise",
};

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "?" : Math.round(n).toLocaleString("fr-FR"));
const signed = (n: number | null) => (n === null ? "?" : `${n > 0 ? "+" : ""}${n.toLocaleString("fr-FR")}`);
const pct = (n: number | null) => (n === null ? null : `${Math.round(n * 10) / 10} %`);

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    textDecoration: "none",
    border: `1px solid ${active ? "rgba(224,30,30,0.6)" : "rgba(137,4,4,0.35)"}`,
    background: active ? "rgba(224,30,30,0.15)" : "transparent",
    color: active ? "#ff6b6b" : "rgba(245,237,237,0.55)",
    whiteSpace: "nowrap",
  };
}

export default async function SocialStatsPage({ searchParams }: { searchParams: Promise<{ p?: string; periode?: string; tri?: string; type?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const sp = await searchParams;
  const platform = sp.p && (PLATFORMS as string[]).includes(sp.p) ? (sp.p as Platform) : null;
  const days = PERIODS.includes(Number(sp.periode)) ? Number(sp.periode) : 30;
  const sort = (SORTS.map((s) => s.key) as string[]).includes(sp.tri ?? "") ? (sp.tri as "vues" | "engagement" | "recent") : "vues";
  const type = sp.type || null;
  const href = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const next = { p: platform, periode: String(days), tri: sort, type, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    return `/dashboard/coach/admin/stats-reseaux?${q.toString()}`;
  };

  const data = await getSocialDashboard({ platform, days, sort, type });
  const hasKey = windsorConfigured();

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto pb-24 md:pb-8 page-transition">
      <Link href="/dashboard/coach/admin/equipe" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6">
        <ChevronLeft size={13} /> Administration
      </Link>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">Administration</p>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-1">Stats réseaux</h1>
      <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 700, color: "rgba(245,237,237,0.6)", fontSize: 16, margin: "0 0 20px" }}>
        Tes vraies stats, pour savoir quoi réitérer.
      </p>

      {!hasKey && (
        <div className="ep-card" style={{ padding: "14px 16px", marginBottom: 14, borderColor: "rgba(250,204,21,0.35)", display: "flex", gap: 10 }}>
          <AlertTriangle size={16} style={{ color: "#facc15", flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.75)", margin: 0, lineHeight: 1.6 }}>
            La clé Windsor n&apos;est pas encore configurée : ajoute <strong>WINDSOR_API_KEY</strong> dans les variables Vercel (Production, Sensitive), puis redéploie. Sans elle, aucune synchro ne peut tourner.
          </p>
        </div>
      )}

      {!data.ready ? (
        <div className="ep-card" style={{ padding: "16px 18px" }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", margin: "0 0 6px" }}>Les tables des stats ne sont pas encore créées.</p>
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.6)", margin: 0, lineHeight: 1.6 }}>
            Exécute la migration <code>supabase/migrations/20260929_social_stats.sql</code> dans le SQL Editor de Supabase, puis recharge cette page. Détail : {data.error}
          </p>
        </div>
      ) : (
        <>
          {/* Synchro */}
          <section className="ep-card-hero" style={{ padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ minWidth: 0 }}>
                <p className="ep-label" style={{ marginBottom: 6 }}>Dernières synchros</p>
                {data.overview.map((a) => (
                  <p key={a.id} style={{ fontSize: 12.5, margin: "0 0 3px", color: "rgba(245,237,237,0.75)" }}>
                    <strong style={{ color: "#F5EDED" }}>{PLATFORM_LABELS[a.platform]}</strong> :{" "}
                    {a.lastRun ? (
                      <span style={{ color: a.lastRun.status === "success" ? "#4ade80" : a.lastRun.status === "running" ? "#facc15" : "#fca5a5" }}>
                        {a.lastRun.status === "success" ? "ok" : a.lastRun.status === "partial" ? "incomplète" : a.lastRun.status === "running" ? "en cours" : "en échec"} le{" "}
                        {new Date(a.lastRun.finished_at ?? a.lastRun.started_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : (
                      <span style={{ color: "rgba(245,237,237,0.45)" }}>jamais synchronisé</span>
                    )}
                    {a.backfillDone ? <span style={{ color: "rgba(245,237,237,0.4)" }}> · historique complet</span> : a.backfillUntil ? <span style={{ color: "rgba(245,237,237,0.4)" }}> · historique remonté jusqu&apos;au {a.backfillUntil}</span> : null}
                  </p>
                ))}
                <p style={{ fontSize: 11, color: "rgba(245,237,237,0.4)", margin: "6px 0 0" }}>Synchro automatique chaque lundi à 6h (heure de Paris).</p>
              </div>
              <SyncNowButton platform={platform} />
            </div>
          </section>

          {/* Filtres */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto" }} className="no-scrollbar">
              <Link href={href({ p: null, type: null })} style={chip(!platform)}>Toutes</Link>
              {PLATFORMS.map((p) => (
                <Link key={p} href={href({ p, type: null })} style={chip(platform === p)}>{PLATFORM_LABELS[p]}</Link>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto" }} className="no-scrollbar">
              {PERIODS.map((d) => (
                <Link key={d} href={href({ periode: String(d) })} style={chip(days === d)}>{d === 365 ? "1 an" : `${d} jours`}</Link>
              ))}
            </div>
          </div>

          {/* Vue d'ensemble */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10, marginBottom: 16 }}>
            {data.overview
              .filter((a) => !platform || a.platform === platform)
              .map((a) => (
                <div key={a.id} className="ep-card" style={{ padding: "14px 16px" }}>
                  <p className="ep-label" style={{ marginBottom: 4 }}>{PLATFORM_LABELS[a.platform]}</p>
                  <p style={{ fontSize: 26, fontWeight: 900, color: "#F5EDED", margin: 0, lineHeight: 1.1 }}>{fmt(a.followers)}</p>
                  <p style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", margin: "0 0 8px" }}>abonnés{a.followersDate ? ` au ${new Date(`${a.followersDate}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}</p>
                  <div style={{ display: "flex", gap: 10, fontSize: 11.5, marginBottom: 8 }}>
                    {(["d7", "d30", "d90"] as const).map((k) => (
                      <span key={k} style={{ color: (a.growth[k] ?? 0) > 0 ? "#4ade80" : (a.growth[k] ?? 0) < 0 ? "#fca5a5" : "rgba(245,237,237,0.5)" }}>
                        {signed(a.growth[k])} <span style={{ color: "rgba(245,237,237,0.35)" }}>{k.slice(1)} j</span>
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.65)", margin: 0, lineHeight: 1.6 }}>
                    Sur {days === 365 ? "1 an" : `${days} jours`} : {fmt(a.period.views || a.period.impressions)} {a.period.views ? "vues" : "impressions"}, {fmt(a.period.reach)} de portée, {fmt(a.period.engagements || a.period.likes + a.period.comments + a.period.shares)} engagements
                  </p>
                </div>
              ))}
          </div>

          {/* Courbes */}
          <section style={{ marginBottom: 18 }}>
            <p className="ep-label" style={{ marginBottom: 8 }}>Évolution</p>
            <SocialCharts series={data.series} labels={data.labels} />
          </section>

          {/* Classement des publications */}
          <section style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <p className="ep-label" style={{ margin: 0 }}>Publications ({data.posts.length})</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SORTS.map((s) => (
                  <Link key={s.key} href={href({ tri: s.key })} style={chip(sort === s.key)}>{s.label}</Link>
                ))}
              </div>
            </div>
            {data.types.length > 1 && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 8 }} className="no-scrollbar">
                <Link href={href({ type: null })} style={chip(!type)}>Tous formats</Link>
                {data.types.map((t) => (
                  <Link key={t} href={href({ type: t })} style={chip(type === t)}>{t}</Link>
                ))}
              </div>
            )}
            {data.posts.length === 0 ? (
              <p className="ep-card" style={{ padding: "14px 16px", fontSize: 13, color: "rgba(245,237,237,0.5)", margin: 0 }}>Aucune publication sur cette période.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.posts.map((p, i) => (
                  <div key={p.id} className="ep-card" style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: i < 3 && sort !== "recent" ? "#E01E1E" : "rgba(245,237,237,0.35)", minWidth: 22 }}>{i + 1}</span>
                    {p.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail_url} alt="" style={{ width: 54, height: 72, objectFit: "cover", borderRadius: 8, flexShrink: 0, background: "#1a0202" }} />
                    ) : null}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", margin: "0 0 2px" }}>
                        {PLATFORM_LABELS[p.platform]}
                        {p.post_type ? ` · ${p.post_type}` : ""}
                        {p.published_at ? ` · ${new Date(p.published_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                      </p>
                      <p style={{ fontSize: 13, color: "#F5EDED", margin: "0 0 6px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>{p.caption || "(sans légende)"}</p>
                      <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.7)", margin: "0 0 6px", lineHeight: 1.6 }}>
                        <strong style={{ color: "#F5EDED" }}>{fmt(p.views ?? p.impressions)}</strong> {p.views !== null ? "vues" : "impressions"}
                        {p.reach !== null ? ` · ${fmt(p.reach)} portée` : ""}
                        {` · ${fmt(p.likes)} j'aime · ${fmt(p.comments)} com. · ${fmt(p.shares)} partages`}
                        {p.saves !== null ? ` · ${fmt(p.saves)} enregistrements` : ""}
                        {p.engagement_rate !== null ? ` · engagement ${pct(p.engagement_rate)}` : ""}
                        {p.completion_rate !== null ? ` · vues complètes ${pct(p.completion_rate)}` : ""}
                        {p.avg_watch_seconds !== null ? ` · ${Math.round(p.avg_watch_seconds)} s regardées en moyenne` : ""}
                        {p.new_followers !== null ? ` · ${fmt(p.new_followers)} nouveaux abonnés` : ""}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                        <PostScriptLink postId={p.id} scriptId={p.script_id} source={p.script_link_source} scripts={data.scripts} />
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 800, color: "#ff6b6b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            Voir <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Audience */}
          <section style={{ marginBottom: 18 }}>
            <p className="ep-label" style={{ marginBottom: 8 }}>Audience</p>
            {data.audience.length === 0 ? (
              <p className="ep-card" style={{ padding: "14px 16px", fontSize: 13, color: "rgba(245,237,237,0.5)", margin: 0 }}>Pas encore de données d&apos;audience.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {data.audience.map((d) => {
                  const max = Math.max(...d.items.map((it) => it.share ?? it.count ?? 0), 1);
                  return (
                    <div key={`${d.platform}-${d.dimension}`} className="ep-card" style={{ padding: "12px 14px" }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: "rgba(245,237,237,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
                        {PLATFORM_LABELS[d.platform]} · {DIMENSIONS[d.dimension] ?? d.dimension}
                      </p>
                      {d.items.map((it) => {
                        const v = it.share ?? it.count ?? 0;
                        return (
                          <div key={it.value} style={{ marginBottom: 5 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, color: "rgba(245,237,237,0.75)" }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.dimension === "heure" ? `${it.value}h` : it.value}</span>
                              <span style={{ flexShrink: 0 }}>{it.share !== null ? pct(it.share) : fmt(it.count)}</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 99, background: "rgba(245,237,237,0.06)" }}>
                              <div style={{ width: `${Math.max(2, (v / max) * 100)}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #890404, #E01E1E)" }} />
                            </div>
                          </div>
                        );
                      })}
                      <p style={{ fontSize: 10, color: "rgba(245,237,237,0.35)", margin: "6px 0 0" }}>au {d.date}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Récap hebdo */}
          <section style={{ marginBottom: 18 }}>
            <p className="ep-label" style={{ marginBottom: 8 }}>Récap de la semaine</p>
            {data.recap ? (
              <div className="ep-card" style={{ padding: "14px 16px" }}>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 12.5, color: "rgba(245,237,237,0.8)", margin: 0, lineHeight: 1.6 }}>{data.recap.markdown}</pre>
                <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.35)", margin: "8px 0 0" }}>{data.recap.notion_page_id ? "Aussi écrit dans Notion." : "Notion pas encore relié (NOTION_API_KEY et NOTION_STATS_DATABASE_ID)."}</p>
              </div>
            ) : (
              <p className="ep-card" style={{ padding: "14px 16px", fontSize: 13, color: "rgba(245,237,237,0.5)", margin: 0 }}>Le premier récap arrive lundi après la synchro de 6h.</p>
            )}
          </section>

          {/* Journal + limites */}
          <section style={{ marginBottom: 8 }}>
            <p className="ep-label" style={{ marginBottom: 8 }}>Journal des synchros</p>
            <div className="ep-card" style={{ padding: "12px 14px" }}>
              {data.runs.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.5)", margin: 0 }}>Aucune synchro pour l&apos;instant.</p>
              ) : (
                data.runs.map((r, i) => {
                  const missing = (r.details?.missingFields ?? {}) as Record<string, string[]>;
                  const missingCount = Object.values(missing).reduce((n, l) => n + (Array.isArray(l) ? l.length : 0), 0);
                  return (
                    <div key={i} style={{ padding: "6px 0", borderTop: i ? "1px solid rgba(245,237,237,0.06)" : "none" }}>
                      <p style={{ fontSize: 12, color: "rgba(245,237,237,0.75)", margin: 0 }}>
                        {new Date(r.started_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {PLATFORM_LABELS[r.platform as Platform] ?? r.platform} · {r.trigger} ·{" "}
                        <span style={{ color: r.status === "success" ? "#4ade80" : r.status === "partial" || r.status === "running" ? "#facc15" : "#fca5a5" }}>{r.status}</span> · {r.rows_written} ligne(s)
                        {missingCount ? <span style={{ color: "rgba(245,237,237,0.45)" }}> · {missingCount} champ(s) non fournis par Windsor</span> : null}
                      </p>
                      {r.error && <p style={{ fontSize: 11.5, color: "#fca5a5", margin: "2px 0 0", wordBreak: "break-word" }}>{r.error.slice(0, 400)}</p>}
                    </div>
                  );
                })
              )}
            </div>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
              {data.overview.flatMap((a) => a.notes.map((n) => <li key={`${a.id}-${n}`} style={{ fontSize: 11.5, color: "rgba(245,237,237,0.45)", marginBottom: 3 }}>{n}</li>))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
