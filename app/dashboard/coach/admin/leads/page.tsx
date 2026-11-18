import { getT } from "@/lib/i18n-server";
import BackButton from "@/components/ui/BackButton";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getAllLeads } from "@/utils/leads";
import { getAllLeadMagnets } from "@/lib/lead-magnets";
import { getLeadOriginReport } from "@/lib/content-leads-tracking";
import { LEAD_ORIGIN_PLATFORMS } from "@/lib/lead-origin";
import LeadsExportButton from "@/components/coach/LeadsExportButton";
import LeadsPipeline from "@/components/coach/LeadsPipeline";
import PrequalInbox, { type PrequalRow } from "@/components/coach/PrequalInbox";
import { auditWhen, prequalAnswerLines, prequalForEmail } from "@/lib/prequal-inbox";
import { activationSteps, funnelSteps, visitGroup, type ActivationCounts } from "@/lib/visit-tracking";
import { createAdminClient } from "@/lib/supabase-admin";
import { updateLeadStatus, updateLeadNote } from "./actions";
import { todayInParis } from "@/lib/dates";
import { ArrowUp, ArrowDown, Minus, Link2 } from "lucide-react";

// Réservé au propriétaire de la plateforme, même garde que
// app/dashboard/coach/admin — les leads captés sur /ressources sont une
// donnée plateforme, pas rattachée à un coach en particulier.
export default async function LeadsAdminPage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const [leads, leadMagnets, prequalRes] = await Promise.all([
    getAllLeads(),
    getAllLeadMagnets(),
    createAdminClient()
      .from("prequalification_responses")
      .select("id, form_type, first_name, last_name, phone, email, answers, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const prequals = (prequalRes.data ?? []) as PrequalRow[];

  // Audits à venir (18/11) : sans closer en poste, une réservation Calendly
  // n'arrivait nulle part dans l'appli (lib/staff-automation.ts, « skipped »).
  // Ici : le RDV, le lien de visio et la candidature de la personne (même
  // email) pour préparer l'appel.
  const { data: bookingRows } = await createAdminClient()
    .from("prospect_bookings")
    .select("event_uri, starts_at, name, email, join_url")
    .eq("status", "active")
    .gte("starts_at", `${todayInParis()}T00:00:00Z`)
    .order("starts_at", { ascending: true })
    .limit(10);
  const audits = ((bookingRows ?? []) as { event_uri: string; starts_at: string; name: string | null; email: string | null; join_url: string | null }[])
    .map((b) => ({ ...b, prequal: prequalForEmail(b.email, prequals) }));

  // Tunnel des 30 derniers jours (C64) : visites publiques (lib/visit-tracking.ts),
  // emails laissés, candidatures, inscriptions et onboarding, même fenêtre.
  const since30 = new Date(new Date(`${todayInParis()}T00:00:00Z`).getTime() - 30 * 86_400_000).toISOString();
  const admin = createAdminClient();
  const [visitRows, signups30, onboarded30, activationRes] = await Promise.all([
    admin.from("page_visits").select("path").gte("created_at", since30).limit(50_000),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_platform_owner", false).not("email", "ilike", "%@epcoaching.app").gte("terms_accepted_at", since30),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_platform_owner", false).not("email", "ilike", "%@epcoaching.app").gte("onboarding_completed_at", since30),
    // Première valeur et retour à J+7 (C64), lus dans les tables d'usage :
    // voir supabase/migrations/20261118090000_funnel_activation.sql.
    admin.rpc("funnel_activation", { p_since: since30 }),
  ]);
  const activation = (Array.isArray(activationRes.data) ? activationRes.data[0] : null) as ActivationCounts | null;
  const paths = ((visitRows.data ?? []) as { path: string }[]).map((v) => v.path);
  const funnel = funnelSteps({
    visits: paths.length,
    resourceVisits: paths.filter((p) => visitGroup(p) === "ressources").length,
    signupPageVisits: paths.filter((p) => visitGroup(p) === "inscription").length,
    leads: leads.filter((l) => l.created_at >= since30).length,
    candidatures: prequals.filter((r) => r.created_at >= since30).length,
    signups: signups30.count ?? 0,
    onboarded: onboarded30.count ?? 0,
  });
  const magnetsBySlug = new Map(leadMagnets.map((m) => [m.slug, m]));
  // Origine en un écran (LANCEMENT.md semaine 2) : plateformes, contenus
  // crédités par leur lien suivi, et pistes pour le reste.
  const origin = await getLeadOriginReport(leads);
  const maxPlatform = Math.max(1, ...origin.byPlatform.map((p) => p.total));

  const byMagnet = new Map<string, number>();
  for (const l of leads) byMagnet.set(l.lead_magnet_slug, (byMagnet.get(l.lead_magnet_slug) ?? 0) + 1);
  const topMagnets = Array.from(byMagnet.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const qualifiedCount = leads.filter((l) => l.qualification_sent_at).length;
  // Nouveau (retour direct 2026-09-09, "ajoute des fonctionnalités auxquelles
  // on n'a pas encore pensé") : le pipeline (20260909b) suit déjà chaque lead
  // jusqu'à "converti", mais aucun taux de conversion global n'était calculé
  // — la métrique qui dit vraiment si les lead magnets rapportent des
  // clients, pas juste des emails captés.
  const convertedCount = leads.filter((l) => l.status === "converti").length;
  const conversionRate = leads.length > 0 ? Math.round((convertedCount / leads.length) * 100) : 0;

  // Nouveau : tendance hebdomadaire — un total cumulé ne dit rien de si le
  // rythme de captation accélère ou ralentit d'une semaine à l'autre.
  const todayMs = new Date(todayInParis() + "T12:00:00").getTime();
  const DAY_MS = 86_400_000;
  const leadsThisWeek = leads.filter((l) => todayMs - new Date(l.created_at).getTime() < 7 * DAY_MS).length;
  const leadsLastWeek = leads.filter((l) => {
    const ageMs = todayMs - new Date(l.created_at).getTime();
    return ageMs >= 7 * DAY_MS && ageMs < 14 * DAY_MS;
  }).length;
  const weeklyDelta = leadsThisWeek - leadsLastWeek;
  const WeeklyTrendIcon = weeklyDelta > 0 ? ArrowUp : weeklyDelta < 0 ? ArrowDown : Minus;
  const weeklyTrendColor = weeklyDelta > 0 ? "var(--ep-ok)" : weeklyDelta < 0 ? "var(--ep-orange)" : "rgba(var(--ep-ink-rgb),0.35)";

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <BackButton fallbackHref="/dashboard/coach/plus" label={t("Retour")} className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-ink)/70 transition-colors mb-6" />

      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">
            {t("Marketing")}
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">{t("Leads")}</h1>
        </div>
        <LeadsExportButton leads={leads} originLabelById={origin.labelById} />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-8" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.35)" }}>
            {t("Total leads")}
          </span>
          <span style={{ fontSize: 17, fontWeight: 900, color: "var(--ep-ink)" }}>{leads.length}</span>
        </div>
        <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ep-info)" }}>
            {t("Qualifiés par Santiago (IA)")}
          </span>
          <span style={{ fontSize: 17, fontWeight: 900, color: "var(--ep-ink)" }}>{qualifiedCount}</span>
        </div>
        <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ep-ok)" }}>
            {t("Taux de conversion")}
          </span>
          <span style={{ fontSize: 17, fontWeight: 900, color: "var(--ep-ink)" }}>
            {conversionRate}% <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(var(--ep-ink-rgb),0.3)" }}>({convertedCount})</span>
          </span>
        </div>
        <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.35)" }}>
            {t("Cette semaine")}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 17, fontWeight: 900, color: "var(--ep-ink)" }}>
            {leadsThisWeek}
            <span style={{ display: "flex", alignItems: "center", gap: 1, fontSize: 10, fontWeight: 800, color: weeklyTrendColor }}>
              <WeeklyTrendIcon size={10} strokeWidth={2.5} />
              {weeklyDelta !== 0 && Math.abs(weeklyDelta)}
            </span>
          </span>
        </div>
        {topMagnets.map(([slug, count]) => {
          const magnet = magnetsBySlug.get(slug);
          return (
            <div key={slug} className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0, minWidth: 140 }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.35)" }}>
                {magnet?.title ?? slug}
              </span>
              <span style={{ fontSize: 15, fontWeight: 900, color: "var(--ep-ink)" }}>{count}</span>
            </div>
          );
        })}
      </div>

      <section className="ep-card mb-6" style={{ padding: "14px 16px" }} aria-labelledby="tunnel-titre">
        <h2 id="tunnel-titre" className="text-sm font-black uppercase tracking-wide mb-2">{t("Tunnel des 30 derniers jours")}</h2>
        <ul className="flex flex-col gap-1">
          {[...funnel, ...activationSteps(activation)].map((f) => (
            <li key={f.label} className="flex items-baseline gap-2 text-[12.5px]">
              <span className="flex-1 text-(--ep-ink)/70">{t(f.label)}</span>
              <b className="text-(--ep-ink)">{f.n}</b>
              <span className="w-28 text-right text-[11px] text-(--ep-ink)/45">{f.rate === null ? "" : `${f.rate} % ${t(f.of ?? "")}`}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10.5px] text-(--ep-ink)/40">{t("Visites comptées depuis le 16/11, une par page et par onglet, sans cookie. Première valeur et retour à J+7 lus dans les séances, repas, bilans et check-ins, sans suivi en plus.")}</p>
      </section>

      {audits.length > 0 && (
        <section className="ep-card mb-6" style={{ padding: "14px 16px", border: "1px solid rgba(var(--ep-accent-rgb),0.35)" }} aria-labelledby="audits-titre">
          <h2 id="audits-titre" className="text-sm font-black uppercase tracking-wide mb-2">{t("Tes audits à venir")}</h2>
          <ul className="flex flex-col gap-3">
            {audits.map((a) => {
              const lines = a.prequal ? prequalAnswerLines(a.prequal.answers) : [];
              return (
                <li key={a.event_uri} className="rounded-xl p-3" style={{ background: "rgba(var(--ep-shade-rgb),0.3)" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="flex-1 min-w-0 text-[13.5px] font-black text-(--ep-ink)">{a.name || a.email || t("Prospect")}</p>
                    <span className="text-[12px] font-bold text-(--ep-accent)">{auditWhen(a.starts_at)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {a.join_url && (
                      <a href={a.join_url} target="_blank" rel="noopener noreferrer" className="h-9 px-3 rounded-full inline-flex items-center text-[12px] font-extrabold" style={{ background: "var(--ep-accent)", color: "#fff" }}>
                        {t("Rejoindre la visio")}
                      </a>
                    )}
                    {a.email && <a href={`mailto:${a.email}`} className="h-9 px-3 rounded-full inline-flex items-center text-[12px] font-extrabold border" style={{ borderColor: "rgba(var(--ep-ink-rgb),0.14)", color: "var(--ep-ink)" }}>{a.email}</a>}
                  </div>
                  {lines.length > 0 ? (
                    <dl className="mt-2 grid gap-1">
                      {lines.map((l) => (
                        <div key={l.label} className="text-[12px]">
                          <dt className="inline font-bold text-(--ep-ink)/60">{t(l.label)} : </dt>
                          <dd className="inline text-(--ep-ink)">{l.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-2 text-[11.5px] text-(--ep-ink)/45">{t("Pas de candidature avec cet email : pose les questions de base au début de l'appel.")}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="ep-card mb-6" style={{ padding: "14px 16px" }} aria-labelledby="liens-suivis">
        <h2 id="liens-suivis" className="text-sm font-black uppercase tracking-wide mb-1">{t("Tes liens suivis")}</h2>
        <p className="text-[11.5px] text-(--ep-ink)/50 mb-2">
          {t("Mets ces liens en bio et dans tes mails : chaque visite est rangée sous le bon réseau. Ajoute une page après, ex. /s/instagram/ressources.")}
        </p>
        <ul className="flex flex-col gap-1 text-[12px]">
          {(["instagram", "tiktok", "linkedin", "youtube", "mail"] as const).map((s) => (
            <li key={s} className="flex gap-2">
              <span className="w-20 text-(--ep-ink)/60">{s}</span>
              <code className="select-all text-(--ep-ink)">ep-coaching.vercel.app/s/{s}</code>
            </li>
          ))}
        </ul>
      </section>

      <PrequalInbox rows={prequals} coachName={(profile.full_name ?? "").split(" ")[0] || null} />

      <section className="ep-card mb-8" style={{ padding: "18px 18px 16px" }} aria-labelledby="leads-origine">
        <h2 id="leads-origine" className="text-sm font-black uppercase tracking-wide mb-1">{t("D'où viennent tes leads")}</h2>
        <p className="text-[11.5px] text-(--ep-ink)/45 mb-4">
          {t("Plateforme d'arrivée, et contenu exact si le visiteur vient d'un lien suivi du Studio.")}
        </p>

        {leads.length === 0 ? (
          <p className="text-xs text-(--ep-ink)/35">{t("Aucun lead pour l'instant.")}</p>
        ) : (
          <>
            <div className="space-y-1.5 mb-5">
              {origin.byPlatform.map((p) => (
                <div key={p.platform} className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-(--ep-ink)/70 w-32 flex-shrink-0 truncate">{p.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-(--ep-ink)/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((p.total / maxPlatform) * 100)}%`,
                        background: p.platform === "inconnue" ? "rgba(var(--ep-ink-rgb),0.2)" : "linear-gradient(90deg, var(--ep-line), var(--ep-accent))",
                        boxShadow: p.platform === "inconnue" ? "none" : "0 0 8px rgba(var(--ep-accent-rgb),0.35)",
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-black text-(--ep-strong) w-8 text-right">{p.total}</span>
                  <span className="text-[10px] text-(--ep-ink)/35 w-16 text-right hidden sm:inline">{p.last30Days} / 30 j</span>
                </div>
              ))}
            </div>

            <p className="text-[9px] font-bold uppercase tracking-widest text-(--ep-yellow) mb-2">{t("Contenus qui amènent des leads (lien suivi)")}</p>
            {origin.byContent.length === 0 ? (
              <p className="text-xs text-(--ep-ink)/40 mb-4">
                {t("Aucun lead encore arrivé par un lien suivi. Copie le lien d'un script dans")}{" "}
                <Link href="/dashboard/coach/studio" className="text-(--ep-accent) font-semibold">{t("Studio créatif")}</Link>{" "}{t("et colle-le sous ta prochaine vidéo : les leads s'afficheront ici, contenu par contenu.")}
              </p>
            ) : (
              <ol className="space-y-1.5 mb-4">
                {origin.byContent.slice(0, 10).map((c, i) => {
                  const pl = c.platform ? (LEAD_ORIGIN_PLATFORMS as Record<string, string>)[c.platform] ?? null : null;
                  return (
                    <li key={c.scriptId} className="flex items-center gap-3 rounded-lg bg-(--ep-s1) border border-(--ep-line)/20 px-3 py-2">
                      <span className="text-[10px] font-black text-(--ep-ink)/30 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-(--ep-strong) truncate">{c.title}</p>
                        <p className="text-[10px] text-(--ep-ink)/40">
                          {pl}
                          {pl && " · "}
                          {c.last30Days}{" "}{t("sur 30 jours")}{c.converted > 0 && ` · ${c.converted} converti${c.converted > 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <span className="text-sm font-black text-(--ep-strong)">{c.total}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            {origin.untrackedTotal > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-[11px] font-semibold text-(--ep-ink)/55 flex items-center gap-1.5">
                  <Link2 size={12} /> {origin.untrackedTotal}{" "}{t("lead")}{origin.untrackedTotal > 1 ? "s" : ""}{" "}{t("sans lien suivi : pistes par guide")}
                </summary>
                <p className="text-[10.5px] text-(--ep-ink)/35 mt-2 mb-2">
                  {t("Scripts dont le CTA cite le même guide. Ce sont des pistes, pas une attribution : plusieurs contenus peuvent citer le même numéro.")}
                </p>
                <ul className="space-y-2">
                  {origin.untracked.map((u) => (
                    <li key={u.slug} className="text-[11px]">
                      <span className="font-bold text-(--ep-strong)">{magnetsBySlug.get(u.slug)?.title ?? u.slug}</span>
                      <span className="text-(--ep-ink)/40"> · {u.total}{" "}{t("lead")}{u.total > 1 ? "s" : ""}</span>
                      <p className="text-[10.5px] text-(--ep-ink)/45 mt-0.5">
                        {u.candidateScripts.length > 0
                          ? u.candidateScripts.map((s) => s.title).join(" · ")
                          : t("Aucun script ne cite ce guide (arrivée directe, partage ou recherche).")}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      <LeadsPipeline
        leads={leads}
        originLabelById={origin.labelById}
        magnetTitleBySlug={Object.fromEntries(leadMagnets.map((m) => [m.slug, m.title]))}
        updateLeadStatus={updateLeadStatus}
        updateLeadNote={updateLeadNote}
      />
    </div>
  );
}
