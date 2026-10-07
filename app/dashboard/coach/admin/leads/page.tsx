import { getT } from "@/lib/i18n-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getAllLeads } from "@/utils/leads";
import { getAllLeadMagnets } from "@/lib/lead-magnets";
import { getLeadOriginReport } from "@/lib/content-leads-tracking";
import { LEAD_ORIGIN_PLATFORMS } from "@/lib/lead-origin";
import LeadsExportButton from "@/components/coach/LeadsExportButton";
import LeadsPipeline from "@/components/coach/LeadsPipeline";
import { updateLeadStatus, updateLeadNote } from "./actions";
import { todayInParis } from "@/lib/dates";
import { ChevronLeft, ArrowUp, ArrowDown, Minus, Link2 } from "lucide-react";

// Réservé au propriétaire de la plateforme, même garde que
// app/dashboard/coach/admin — les leads captés sur /ressources sont une
// donnée plateforme, pas rattachée à un coach en particulier.
export default async function LeadsAdminPage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const [leads, leadMagnets] = await Promise.all([getAllLeads(), getAllLeadMagnets()]);
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
  const weeklyTrendColor = weeklyDelta > 0 ? "#4ade80" : weeklyDelta < 0 ? "#fb923c" : "rgba(245,237,237,0.35)";

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <Link
        href="/dashboard/coach"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        {t("Retour")}
      </Link>

      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            {t("Marketing")}
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">{t("Leads")}</h1>
          <p className="text-sm text-[#F5EDED]/45 mt-2">
            {t("Emails et numéros captés sur les lead magnets de /ressources.")}
          </p>
        </div>
        <LeadsExportButton leads={leads} originLabelById={origin.labelById} />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-8" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)" }}>
            {t("Total leads")}
          </span>
          <span style={{ fontSize: 17, fontWeight: 900, color: "#F5EDED" }}>{leads.length}</span>
        </div>
        <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#60a5fa" }}>
            {t("Qualifiés par Santiago (IA)")}
          </span>
          <span style={{ fontSize: 17, fontWeight: 900, color: "#F5EDED" }}>{qualifiedCount}</span>
        </div>
        <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4ade80" }}>
            {t("Taux de conversion")}
          </span>
          <span style={{ fontSize: 17, fontWeight: 900, color: "#F5EDED" }}>
            {conversionRate}% <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(245,237,237,0.3)" }}>({convertedCount})</span>
          </span>
        </div>
        <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)" }}>
            {t("Cette semaine")}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 17, fontWeight: 900, color: "#F5EDED" }}>
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
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)" }}>
                {magnet?.title ?? slug}
              </span>
              <span style={{ fontSize: 15, fontWeight: 900, color: "#F5EDED" }}>{count}</span>
            </div>
          );
        })}
      </div>

      <section className="ep-card mb-8" style={{ padding: "18px 18px 16px" }} aria-labelledby="leads-origine">
        <h2 id="leads-origine" className="text-sm font-black uppercase tracking-wide mb-1">{t("D'où viennent tes leads")}</h2>
        <p className="text-[11.5px] text-[#F5EDED]/45 mb-4">
          {t("Plateforme détectée à l'arrivée, et contenu exact quand le visiteur est passé par le lien suivi d'un script (bouton « Lien suivi du guide » dans Studio créatif, à coller en description ou en bio).")}
        </p>

        {leads.length === 0 ? (
          <p className="text-xs text-[#F5EDED]/35">{t("Aucun lead pour l'instant.")}</p>
        ) : (
          <>
            <div className="space-y-1.5 mb-5">
              {origin.byPlatform.map((p) => (
                <div key={p.platform} className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-[#F5EDED]/70 w-32 flex-shrink-0 truncate">{p.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-[#F5EDED]/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((p.total / maxPlatform) * 100)}%`,
                        background: p.platform === "inconnue" ? "rgba(245,237,237,0.2)" : "linear-gradient(90deg, #890404, #E01E1E)",
                        boxShadow: p.platform === "inconnue" ? "none" : "0 0 8px rgba(224,30,30,0.35)",
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-black text-white w-8 text-right">{p.total}</span>
                  <span className="text-[10px] text-[#F5EDED]/35 w-16 text-right hidden sm:inline">{p.last30Days} / 30 j</span>
                </div>
              ))}
            </div>

            <p className="text-[9px] font-bold uppercase tracking-widest text-[#facc15] mb-2">{t("Contenus qui amènent des leads (lien suivi)")}</p>
            {origin.byContent.length === 0 ? (
              <p className="text-xs text-[#F5EDED]/40 mb-4">
                {t("Aucun lead encore arrivé par un lien suivi. Copie le lien d'un script dans")}{" "}
                <Link href="/dashboard/coach/studio" className="text-[#E01E1E] font-semibold">{t("Studio créatif")}</Link>{" "}{t("et colle-le sous ta prochaine vidéo : les leads s'afficheront ici, contenu par contenu.")}
              </p>
            ) : (
              <ol className="space-y-1.5 mb-4">
                {origin.byContent.slice(0, 10).map((c, i) => {
                  const pl = c.platform ? (LEAD_ORIGIN_PLATFORMS as Record<string, string>)[c.platform] ?? null : null;
                  return (
                    <li key={c.scriptId} className="flex items-center gap-3 rounded-lg bg-[#1f0101] border border-[#890404]/20 px-3 py-2">
                      <span className="text-[10px] font-black text-[#F5EDED]/30 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{c.title}</p>
                        <p className="text-[10px] text-[#F5EDED]/40">
                          {pl}
                          {pl && " · "}
                          {c.last30Days}{" "}{t("sur 30 jours")}{c.converted > 0 && ` · ${c.converted} converti${c.converted > 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <span className="text-sm font-black text-white">{c.total}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            {origin.untrackedTotal > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-[11px] font-semibold text-[#F5EDED]/55 flex items-center gap-1.5">
                  <Link2 size={12} /> {origin.untrackedTotal}{" "}{t("lead")}{origin.untrackedTotal > 1 ? "s" : ""}{" "}{t("sans lien suivi : pistes par guide")}
                </summary>
                <p className="text-[10.5px] text-[#F5EDED]/35 mt-2 mb-2">
                  {t("Scripts dont le CTA cite le même guide. Ce sont des pistes, pas une attribution : plusieurs contenus peuvent citer le même numéro.")}
                </p>
                <ul className="space-y-2">
                  {origin.untracked.map((u) => (
                    <li key={u.slug} className="text-[11px]">
                      <span className="font-bold text-white">{magnetsBySlug.get(u.slug)?.title ?? u.slug}</span>
                      <span className="text-[#F5EDED]/40"> · {u.total}{" "}{t("lead")}{u.total > 1 ? "s" : ""}</span>
                      <p className="text-[10.5px] text-[#F5EDED]/45 mt-0.5">
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
