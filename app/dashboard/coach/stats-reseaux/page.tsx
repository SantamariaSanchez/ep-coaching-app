import { getT } from "@/lib/i18n-server";
import { redirect } from "next/navigation";
import { ExternalLink, Zap, Repeat2 } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { todayInParis } from "@/lib/dates";
import { getReadings } from "@/lib/social/readings";
import { PLATFORM_LABELS, type Platform } from "@/lib/social/platforms";
import { nativeStatsLink } from "@/lib/social/native-stats";
import { SIGNAL_LABELS, MIN_COMPARABLE, type Verdict } from "@/lib/social/post-insights";
import { getAppSetup } from "@/lib/app-setup-server";
import { COACH_PLATFORMS } from "@/lib/app-setup";
import PostEntryForm from "@/components/social/PostEntryForm";

// Ce qui marche (refonte du 03/11/2026, décision d'Emmanuel) : les stats
// brutes sont déjà sur chaque réseau, l'appli ne les recopie plus. Le coach
// envoie une capture des stats d'une publication (ou tape les chiffres), et
// l'appli lui dit, avec des règles codées et sans IA, ce qui marche chez lui
// et comment le refaire, en le comparant à ses propres publications.

export const dynamic = "force-dynamic";

const ALL: Platform[] = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "threads"];
const TYPE_LABELS: Record<string, string> = { reel: "Reel", video: "Vidéo", short: "Short", carrousel: "Carrousel", post: "Post photo", texte: "Post texte", story: "Story", live: "Live" };

const VERDICT: Record<Verdict, { label: string; color: string; bg: string }> = {
  a_refaire: { label: "À refaire", color: "var(--ep-ok)", bg: "rgba(34,197,94,0.12)" },
  dans_ta_moyenne: { label: "Dans ta moyenne", color: "rgba(var(--ep-ink-rgb),0.7)", bg: "rgba(var(--ep-ink-rgb),0.06)" },
  en_dessous: { label: "En dessous", color: "#fca5a5", bg: "rgba(248,113,113,0.1)" },
  pas_assez: { label: "Pas encore comparable", color: "rgba(var(--ep-ink-rgb),0.5)", bg: "rgba(var(--ep-ink-rgb),0.05)" },
};

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? null : Math.round(n).toLocaleString("fr-FR"));
const times = (r: number) => `×${(Math.round(r * 10) / 10).toLocaleString("fr-FR")}`;

export default async function WhatWorksPage() {
  const tr = await getT();
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const [data, setup] = await Promise.all([getReadings(user.id), getAppSetup(user.id)]);
  const today = todayInParis();
  const nowLocal = `${today}T${new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date())}`;

  const chosen = Array.isArray(setup.answers.plateformes) ? (setup.answers.plateformes as string[]) : [];
  const used = [...new Set(data.posts.map((p) => p.platform))];
  const platforms = ALL.filter((p) => chosen.includes(p) || used.includes(p));
  const shown = platforms.length ? platforms : ALL;
  const formPlatforms = platforms.length ? platforms : COACH_PLATFORMS.map((o) => o.value);

  const comparable = data.posts.filter((p) => p.reading.verdict !== "pas_assez");
  const groups = [
    { title: tr("Format du script"), rows: data.byFormat },
    { title: tr("Type de publication"), rows: data.byType.map((r) => ({ ...r, key: TYPE_LABELS[r.key] ?? r.key })) },
    { title: tr("Pilier"), rows: data.byPillar },
  ].filter((g) => g.rows.length > 0);

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto pb-24 md:pb-8 page-transition">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">{tr("Business")}</p>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-1">{tr("Ce qui marche")}</h1>
      <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.6)", fontSize: 16, margin: "0 0 18px" }}>
        {tr("Envoie une capture de tes stats : l'appli te dit ce qui marche et comment le refaire.")}
      </p>

      {/* 1. Analyser une publication */}
      <section style={{ marginBottom: 18 }}>
        <PostEntryForm platforms={formPlatforms} scripts={data.scripts} nowLocal={nowLocal} label="Analyser une publication" />
        <p style={{ fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.5)", margin: "6px 2px 0", lineHeight: 1.5 }}>
          {tr("Relie la publication à son script du Studio : l'appli saura quels formats et quels piliers marchent chez toi.")}
        </p>
      </section>

      {/* 2. Ce qui marche chez toi */}
      <section style={{ marginBottom: 18 }}>
        <p className="ep-label" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Zap size={12} />{" "}{tr("Ce qui marche chez toi")}
        </p>
        <div className="ep-card" style={{ padding: "14px 16px" }}>
          {comparable.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.6)", margin: 0, lineHeight: 1.6 }}>
              {tr("Analyse au moins")}{" "}{MIN_COMPARABLE + 1}{" "}{tr("publications : l'appli compare chacune à tes autres, jamais à des chiffres d'ailleurs.")}
              {data.posts.length ? ` ${tr("Déjà")} ${data.posts.length}.` : ""}
            </p>
          ) : groups.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.6)", margin: 0, lineHeight: 1.6 }}>
              {tr("Relie tes publications à leur script ou indique leur format : il faut au moins 2 publications par groupe pour comparer.")}
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {groups.map((g) => (
                <div key={g.title}>
                  <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(var(--ep-ink-rgb),0.45)", margin: "0 0 6px" }}>{g.title}</p>
                  {g.rows.slice(0, 3).map((r, i) => (
                    <p key={r.key} style={{ fontSize: 12.5, margin: "0 0 3px", color: i === 0 ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.6)" }}>
                      {i === 0 ? "★ " : ""}
                      {r.key} : {times(r.score)} <span style={{ color: "rgba(var(--ep-ink-rgb),0.35)" }}>({r.count})</span>
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
          {comparable.length > 0 && (
            <p style={{ fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.45)", margin: "10px 0 0" }}>
              {tr("×1 = ta moyenne. ×1,5 = moitié mieux que d'habitude chez toi.")}
            </p>
          )}
        </div>
      </section>

      {/* 3. Publications lues */}
      <section style={{ marginBottom: 18 }}>
        <p className="ep-label" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Repeat2 size={12} />{" "}{tr("Tes publications analysées")}{" "}({data.posts.length})
        </p>
        {data.posts.length === 0 ? (
          <p className="ep-card" style={{ padding: "14px 16px", fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.5)", margin: 0 }}>
            {tr("Aucune publication analysée pour l'instant. Commence par ta dernière vidéo : une capture de ses statistiques suffit.")}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.posts.map((p) => {
              const v = VERDICT[p.reading.verdict];
              const numbers = [
                fmt(p.views ?? p.reach) && `${fmt(p.views ?? p.reach)} ${p.views !== null ? "vues" : "portée"}`,
                fmt(p.shares) && `${fmt(p.shares)} partages`,
                fmt(p.saves) && `${fmt(p.saves)} enregistrements`,
                fmt(p.comments) && `${fmt(p.comments)} com.`,
                fmt(p.new_followers) && `+${fmt(p.new_followers)} abonnés`,
              ].filter(Boolean);
              return (
                <div key={p.id} className="ep-card" style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.45)", margin: "0 0 2px" }}>
                        {PLATFORM_LABELS[p.platform]}
                        {p.post_type ? ` · ${TYPE_LABELS[p.post_type] ?? p.post_type}` : ""}
                        {p.formatLabel ? ` · ${p.formatLabel}` : ""}
                        {p.published_at ? ` · ${new Date(p.published_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" })}` : ""}
                      </p>
                      <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ep-ink)", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>
                        {p.scriptTitle || p.caption || tr("(sans titre)")}
                      </p>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 8px", borderRadius: 999, color: v.color, background: v.bg }}>{tr(v.label)}</span>
                  </div>
                  {numbers.length > 0 && <p style={{ fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.6)", margin: "6px 0 0" }}>{numbers.join(" · ")}</p>}
                  {(p.reading.strengths.length > 0 || p.reading.weaknesses.length > 0) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {p.reading.strengths.map((s) => (
                        <span key={s} style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "rgba(34,197,94,0.12)", color: "var(--ep-ok)" }}>
                          {SIGNAL_LABELS[s]} {times(p.reading.ratios[s] as number)}
                        </span>
                      ))}
                      {p.reading.weaknesses.map((s) => (
                        <span key={s} style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "rgba(248,113,113,0.1)", color: "#fca5a5" }}>
                          {SIGNAL_LABELS[s]} {times(p.reading.ratios[s] as number)}
                        </span>
                      ))}
                    </div>
                  )}
                  {p.reading.howTo.length > 0 && (
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {p.reading.howTo.map((h) => (
                        <li key={h} style={{ fontSize: 12.5, color: "rgba(var(--ep-ink-rgb),0.8)", lineHeight: 1.55, marginBottom: 2 }}>{tr(h)}</li>
                      ))}
                    </ul>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 8 }}>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 800, color: "var(--ep-accent-hi2)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {tr("Voir")}{" "}<ExternalLink size={11} />
                      </a>
                    )}
                    {p.manual && <PostEntryForm platforms={formPlatforms} scripts={data.scripts} nowLocal={nowLocal} post={p} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Les stats complètes restent sur chaque réseau */}
      <section style={{ marginBottom: 18 }}>
        <p className="ep-label" style={{ marginBottom: 8 }}>{tr("Tes stats complètes, sur chaque réseau")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
          {shown.map((pl) => {
            const l = nativeStatsLink(pl, data.handles[pl]);
            return (
              <a key={pl} href={l.url} target="_blank" rel="noopener noreferrer" className="ep-card" style={{ padding: "10px 12px", textDecoration: "none", color: "var(--ep-ink)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800 }}>
                  {PLATFORM_LABELS[pl]} <ExternalLink size={12} style={{ color: "var(--ep-accent)" }} />
                </span>
                <span style={{ display: "block", fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.5)", marginTop: 2, lineHeight: 1.45 }}>{tr(l.where)}</span>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
