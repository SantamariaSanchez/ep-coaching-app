import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Zap, RefreshCw, Target } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { todayInParis } from "@/lib/dates";
import { getSocialDashboard } from "@/lib/social/queries";
import { PLATFORM_LABELS, type Platform } from "@/lib/social/platforms";
import { getAppSetup } from "@/lib/app-setup-server";
import { COACH_PLATFORMS } from "@/lib/app-setup";
import SocialCharts from "@/components/social/SocialCharts";
import PostScriptLink from "@/components/social/PostScriptLink";
import AccountEntryForm from "@/components/social/AccountEntryForm";
import PostEntryForm from "@/components/social/PostEntryForm";

// Mes stats réseaux (2026-09-29) : chaque coach suit ses abonnés, sa
// portée, ses vues et ses publications, les relie à ses scripts du Studio
// et voit ce qui marche vraiment chez lui. Saisie manuelle en 1 minute ;
// les comptes synchronisés automatiquement (Windsor) s'affichent pareil.

export const dynamic = "force-dynamic";

const ALL: Platform[] = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "threads"];
const PERIODS = [7, 30, 90, 365];
const SORTS = [
  { key: "vues", label: "Vues" },
  { key: "engagement", label: "Engagement" },
  { key: "recent", label: "Récentes" },
] as const;
const TYPE_LABELS: Record<string, string> = { reel: "Reel", video: "Vidéo", short: "Short", carrousel: "Carrousel", post: "Post photo", texte: "Post texte", story: "Story", live: "Live" };

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

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);
}

export default async function MySocialStatsPage({ searchParams }: { searchParams: Promise<{ p?: string; periode?: string; tri?: string; type?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const sp = await searchParams;
  const platform = sp.p && (ALL as string[]).includes(sp.p) ? (sp.p as Platform) : null;
  const days = PERIODS.includes(Number(sp.periode)) ? Number(sp.periode) : 30;
  const sort = (SORTS.map((s) => s.key) as string[]).includes(sp.tri ?? "") ? (sp.tri as "vues" | "engagement" | "recent") : "vues";
  const type = sp.type || null;
  const href = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const next = { p: platform, periode: String(days), tri: sort, type, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    return `/dashboard/coach/stats-reseaux?${q.toString()}`;
  };

  const [data, setup] = await Promise.all([getSocialDashboard({ ownerId: user.id, platform, days, sort, type }), getAppSetup(user.id)]);
  const today = todayInParis();
  const nowLocal = `${today}T${new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date())}`;

  if (!data.ready) {
    return (
      <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
        <p className="ep-card" style={{ padding: 16, fontSize: 13, color: "rgba(245,237,237,0.6)" }}>Les stats réseaux ne sont pas disponibles pour le moment.</p>
      </div>
    );
  }

  // Plateformes : celles choisies dans "Mon appli" + celles qui ont déjà des chiffres.
  const chosen = Array.isArray(setup.answers.plateformes) ? (setup.answers.plateformes as string[]) : [];
  const withData = data.overview.map((a) => a.platform as string);
  const platforms = ALL.filter((p) => chosen.includes(p) || withData.includes(p));
  const formPlatforms = platforms.length ? platforms : COACH_PLATFORMS.map((o) => o.value);

  const handles = Object.fromEntries(data.overview.map((a) => [a.platform, a.handle]));
  const goals = Object.fromEntries(data.overview.map((a) => [a.platform, a.goal]));
  const overview = data.overview.filter((a) => !platform || a.platform === platform);
  const needsUpdate = data.overview.filter((a) => a.source === "manuel" && (!a.lastEntry || daysBetween(a.lastEntry, today) >= 7));
  const ins = data.insights;
  const totalFollowers = data.overview.reduce((s, a) => s + (a.followers ?? 0), 0);

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto pb-24 md:pb-8 page-transition">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">Contenu</p>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-1">Mes stats réseaux</h1>
      <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 700, color: "rgba(245,237,237,0.6)", fontSize: 16, margin: "0 0 18px" }}>
        Tes vrais chiffres, pour savoir quoi refaire.
      </p>

      {profile?.is_platform_owner && (
        <Link href="/dashboard/coach/admin/stats-reseaux" className="ep-card" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 14, textDecoration: "none", fontSize: 12.5, color: "rgba(245,237,237,0.75)" }}>
          <RefreshCw size={14} style={{ color: "#E01E1E" }} /> Synchro automatique, audience et récap hebdo : ouvrir la vue Administration
        </Link>
      )}

      {needsUpdate.length > 0 && (
        <div className="ep-card-hero" style={{ padding: "12px 14px", marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: "#F5EDED", margin: 0, fontWeight: 700 }}>
            À mettre à jour : {needsUpdate.map((a) => PLATFORM_LABELS[a.platform]).join(", ")}
          </p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.55)", margin: "2px 0 0" }}>1 minute par semaine suffit pour voir ta vraie progression.</p>
        </div>
      )}

      {/* Vue d'ensemble */}
      {data.overview.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 8 }} className="no-scrollbar">
            <Link href={href({ p: null, type: null })} style={chip(!platform)}>Toutes</Link>
            {platforms.map((p) => (
              <Link key={p} href={href({ p, type: null })} style={chip(platform === p)}>{PLATFORM_LABELS[p]}</Link>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12 }} className="no-scrollbar">
            {PERIODS.map((d) => (
              <Link key={d} href={href({ periode: String(d) })} style={chip(days === d)}>{d === 365 ? "1 an" : `${d} jours`}</Link>
            ))}
          </div>

          {!platform && data.overview.length > 1 && (
            <p style={{ fontSize: 13, color: "rgba(245,237,237,0.7)", margin: "0 0 10px" }}>
              <strong style={{ color: "#F5EDED", fontSize: 18 }}>{fmt(totalFollowers)}</strong> abonnés au total sur {data.overview.length} plateformes
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10, marginBottom: 16 }}>
            {overview.map((a) => {
              const goalPct = a.goal && a.followers !== null ? Math.min(100, Math.round((a.followers / a.goal.followers) * 100)) : null;
              // Rythme nécessaire pour tenir l'objectif à la date visée.
              const perWeekNeeded = a.goal && a.goal.date && a.followers !== null && a.goal.followers > a.followers ? Math.ceil((a.goal.followers - a.followers) / Math.max(1, daysBetween(today, a.goal.date) / 7)) : null;
              return (
                <div key={a.id} className="ep-card" style={{ padding: "14px 16px" }}>
                  <p className="ep-label" style={{ marginBottom: 4 }}>
                    {PLATFORM_LABELS[a.platform]}
                    {a.handle ? <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 600, color: "rgba(245,237,237,0.4)" }}> · {a.handle}</span> : null}
                  </p>
                  <p style={{ fontSize: 26, fontWeight: 900, color: "#F5EDED", margin: 0, lineHeight: 1.1 }}>{fmt(a.followers)}</p>
                  <p style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", margin: "0 0 8px" }}>
                    abonnés{a.followersDate ? ` au ${new Date(`${a.followersDate}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}
                    {a.source === "windsor" ? " · synchro auto" : ""}
                  </p>
                  <div style={{ display: "flex", gap: 10, fontSize: 11.5, marginBottom: 8 }}>
                    {(["d7", "d30", "d90"] as const).map((k) => (
                      <span key={k} style={{ color: (a.growth[k] ?? 0) > 0 ? "#4ade80" : (a.growth[k] ?? 0) < 0 ? "#fca5a5" : "rgba(245,237,237,0.5)" }}>
                        {signed(a.growth[k])} <span style={{ color: "rgba(245,237,237,0.35)" }}>{k.slice(1)} j</span>
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.65)", margin: 0, lineHeight: 1.6 }}>
                    Sur {days === 365 ? "1 an" : `${days} jours`} : {fmt(a.period.views || a.period.impressions)} {a.period.views ? "vues" : "impressions"}, {fmt(a.period.reach)} de portée, {fmt(a.period.engagements || a.period.likes + a.period.comments + a.period.shares)} interactions
                  </p>
                  {a.goal && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(245,237,237,0.6)", marginBottom: 4 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Target size={11} /> {fmt(a.goal.followers)}{a.goal.date ? ` d'ici le ${new Date(`${a.goal.date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}</span>
                        <span>{goalPct ?? 0} %</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: "rgba(245,237,237,0.07)" }}>
                        <div style={{ width: `${goalPct ?? 0}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #890404, #E01E1E)" }} />
                      </div>
                      {perWeekNeeded !== null && <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.45)", margin: "4px 0 0" }}>Il te faut environ +{fmt(perWeekNeeded)} abonnés par semaine.</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Saisie */}
      <section style={{ marginBottom: 18 }}>
        <p className="ep-label" style={{ marginBottom: 8 }}>{data.overview.length ? "Mettre à jour mes chiffres" : "Commence ici : tes chiffres du moment"}</p>
        <AccountEntryForm platforms={formPlatforms} today={today} handles={handles} goals={goals} />
      </section>

      {/* Ce qui marche */}
      {ins.postCount > 0 && (
        <section style={{ marginBottom: 18 }}>
          <p className="ep-label" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={12} /> Ce qui marche chez toi (90 derniers jours)
          </p>
          <div className="ep-card" style={{ padding: "14px 16px" }}>
            <p style={{ fontSize: 13, color: "rgba(245,237,237,0.8)", margin: "0 0 10px", lineHeight: 1.6 }}>
              {ins.postCount} publication{ins.postCount > 1 ? "s" : ""}, soit {ins.perWeek ?? 0} par semaine, {fmt(ins.avgViews)} vues en moyenne
              {ins.avgEngagement !== null ? `, engagement moyen ${pct(ins.avgEngagement)}` : ""}.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {[
                { title: "Meilleur format", rows: ins.byFormat.map((r) => ({ ...r, key: TYPE_LABELS[r.key] ?? r.key })) },
                { title: "Meilleur jour", rows: ins.byWeekday },
                { title: "Meilleure heure", rows: ins.byHour },
              ].map((b) => (
                <div key={b.title}>
                  <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(245,237,237,0.45)", margin: "0 0 6px" }}>{b.title}</p>
                  {b.rows.length === 0 ? (
                    <p style={{ fontSize: 12, color: "rgba(245,237,237,0.4)", margin: 0 }}>Pas encore assez de publications (2 minimum par groupe).</p>
                  ) : (
                    b.rows.slice(0, 3).map((r, i) => (
                      <p key={r.key} style={{ fontSize: 12.5, margin: "0 0 3px", color: i === 0 ? "#F5EDED" : "rgba(245,237,237,0.6)" }}>
                        {i === 0 ? "★ " : ""}
                        {r.key} : {fmt(r.avgViews)} vues moy. <span style={{ color: "rgba(245,237,237,0.35)" }}>({r.count})</span>
                      </p>
                    ))
                  )}
                </div>
              ))}
            </div>
            {ins.scripted.withScript > 0 && ins.scripted.avgWith !== null && ins.scripted.avgWithout !== null && ins.postCount > ins.scripted.withScript && (
              <p style={{ fontSize: 12, color: "rgba(245,237,237,0.65)", margin: "10px 0 0" }}>
                Avec un script du Studio : {fmt(ins.scripted.avgWith)} vues moy., sans : {fmt(ins.scripted.avgWithout)}.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Courbes */}
      {data.overview.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <p className="ep-label" style={{ marginBottom: 8 }}>Évolution</p>
          <SocialCharts series={data.series} labels={data.labels} />
        </section>
      )}

      {/* Publications */}
      <section style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <p className="ep-label" style={{ margin: 0 }}>Mes publications ({data.posts.length})</p>
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
              <Link key={t} href={href({ type: t })} style={chip(type === t)}>{TYPE_LABELS[t] ?? t}</Link>
            ))}
          </div>
        )}
        <div style={{ marginBottom: 10 }}>
          <PostEntryForm platforms={formPlatforms} scripts={data.scripts} nowLocal={nowLocal} />
        </div>
        {data.posts.length === 0 ? (
          <p className="ep-card" style={{ padding: "14px 16px", fontSize: 13, color: "rgba(245,237,237,0.5)", margin: 0 }}>
            Aucune publication sur cette période. Ajoute tes derniers contenus avec leurs chiffres pour voir ce qui marche.
          </p>
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
                    {p.post_type ? ` · ${TYPE_LABELS[p.post_type] ?? p.post_type}` : ""}
                    {p.published_at ? ` · ${new Date(p.published_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                  </p>
                  <p style={{ fontSize: 13, color: "#F5EDED", margin: "0 0 6px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>{p.caption || p.scriptTitle || "(sans titre)"}</p>
                  <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.7)", margin: "0 0 6px", lineHeight: 1.6 }}>
                    <strong style={{ color: "#F5EDED" }}>{fmt(p.views ?? p.impressions ?? p.reach)}</strong> {p.views !== null ? "vues" : p.impressions !== null ? "impressions" : "portée"}
                    {p.reach !== null && p.views !== null ? ` · ${fmt(p.reach)} portée` : ""}
                    {p.likes !== null ? ` · ${fmt(p.likes)} j'aime` : ""}
                    {p.comments !== null ? ` · ${fmt(p.comments)} com.` : ""}
                    {p.shares !== null ? ` · ${fmt(p.shares)} partages` : ""}
                    {p.saves !== null ? ` · ${fmt(p.saves)} enregistrements` : ""}
                    {p.engagement_rate !== null ? ` · engagement ${pct(p.engagement_rate)}` : ""}
                    {p.completion_rate !== null ? ` · vues complètes ${pct(p.completion_rate)}` : ""}
                    {p.avg_watch_seconds !== null ? ` · ${Math.round(p.avg_watch_seconds)} s regardées en moyenne` : ""}
                    {p.new_followers !== null ? ` · +${fmt(p.new_followers)} abonnés` : ""}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    {!p.manual && <PostScriptLink postId={p.id} scriptId={p.script_id} source={p.script_link_source} scripts={data.scripts} />}
                    {p.manual && p.scriptTitle && <span style={{ fontSize: 11, color: "rgba(245,237,237,0.5)" }}>Script : {p.scriptTitle.slice(0, 50)}</span>}
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 800, color: "#ff6b6b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Voir <ExternalLink size={11} />
                      </a>
                    )}
                    {p.manual && <PostEntryForm platforms={formPlatforms} scripts={data.scripts} nowLocal={nowLocal} post={p} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
