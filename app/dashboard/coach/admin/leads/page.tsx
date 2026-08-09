import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getAllLeads } from "@/utils/leads";
import { getLeadMagnet } from "@/lib/lead-magnets";
import LeadsExportButton from "@/components/coach/LeadsExportButton";
import { ChevronLeft, Mail, Phone } from "lucide-react";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Réservé au propriétaire de la plateforme, même garde que
// app/dashboard/coach/admin — les leads captés sur /ressources sont une
// donnée plateforme, pas rattachée à un coach en particulier.
export default async function LeadsAdminPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const leads = await getAllLeads();

  const byMagnet = new Map<string, number>();
  for (const l of leads) byMagnet.set(l.lead_magnet_slug, (byMagnet.get(l.lead_magnet_slug) ?? 0) + 1);
  const topMagnets = Array.from(byMagnet.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <Link
        href="/dashboard/coach/admin"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Administration
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
        {topMagnets.map(([slug, count]) => {
          const magnet = getLeadMagnet(slug);
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

      {leads.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <Mail size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucun lead capté pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((l) => {
            const magnet = getLeadMagnet(l.lead_magnet_slug);
            return (
              <div
                key={l.id}
                className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{magnet?.title ?? l.lead_magnet_slug}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {l.email && (
                      <span className="flex items-center gap-1 text-[11px] text-[#F5EDED]/50">
                        <Mail size={10} /> {l.email}
                      </span>
                    )}
                    {l.phone && (
                      <span className="flex items-center gap-1 text-[11px] text-[#F5EDED]/50">
                        <Phone size={10} /> {l.phone}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-[#F5EDED]/25 flex-shrink-0">{formatDate(l.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
