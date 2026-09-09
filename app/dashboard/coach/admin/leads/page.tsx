import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getAllLeads } from "@/utils/leads";
import { getAllLeadMagnets } from "@/lib/lead-magnets";
import LeadsExportButton from "@/components/coach/LeadsExportButton";
import LeadsPipeline from "@/components/coach/LeadsPipeline";
import { updateLeadStatus, updateLeadNote } from "./actions";
import { todayInParis } from "@/lib/dates";
import { ChevronLeft, ArrowUp, ArrowDown, Minus } from "lucide-react";

// Réservé au propriétaire de la plateforme, même garde que
// app/dashboard/coach/admin — les leads captés sur /ressources sont une
// donnée plateforme, pas rattachée à un coach en particulier.
export default async function LeadsAdminPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const [leads, leadMagnets] = await Promise.all([getAllLeads(), getAllLeadMagnets()]);
  const magnetsBySlug = new Map(leadMagnets.map((m) => [m.slug, m]));

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
        Retour
      </Link>

      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Marketing
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">Leads</h1>
          <p className="text-sm text-[#F5EDED]/45 mt-2">
            Emails et numéros captés sur les lead magnets de /ressources.
          </p>
        </div>
        <LeadsExportButton leads={leads} />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-8" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)" }}>
            Total leads
          </span>
          <span style={{ fontSize: 17, fontWeight: 900, color: "#F5EDED" }}>{leads.length}</span>
        </div>
        <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#60a5fa" }}>
            Qualifiés par Santiago (IA)
          </span>
          <span style={{ fontSize: 17, fontWeight: 900, color: "#F5EDED" }}>{qualifiedCount}</span>
        </div>
        <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4ade80" }}>
            Taux de conversion
          </span>
          <span style={{ fontSize: 17, fontWeight: 900, color: "#F5EDED" }}>
            {conversionRate}% <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(245,237,237,0.3)" }}>({convertedCount})</span>
          </span>
        </div>
        <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)" }}>
            Cette semaine
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

      <LeadsPipeline
        leads={leads}
        magnetTitleBySlug={Object.fromEntries(leadMagnets.map((m) => [m.slug, m.title]))}
        updateLeadStatus={updateLeadStatus}
        updateLeadNote={updateLeadNote}
      />
    </div>
  );
}
