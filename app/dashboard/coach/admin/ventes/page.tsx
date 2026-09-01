import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getMySalesCalls } from "@/lib/sales-calls";
import SalesCallsTable from "@/components/coach/SalesCallsTable";
import { ChevronLeft, PhoneCall } from "lucide-react";

function StatCard({ label, value, sub, color = "#F5EDED" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="ep-card" style={{ padding: "10px 16px", display: "flex", flexDirection: "column", flexShrink: 0, minWidth: 120 }}>
      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)" }}>
        {label}
      </span>
      <span style={{ fontSize: 17, fontWeight: 900, color, margin: 0 }}>{value}</span>
      {sub && <span style={{ fontSize: 9.5, color: "rgba(245,237,237,0.35)" }}>{sub}</span>}
    </div>
  );
}

// Tableau simple de suivi des appels de vente (TODO Notion #13, source
// synthèse webinaire Matis Clouet) : appels bookés, show up, closing, CA.
// Rempli manuellement après chaque appel, base du futur revenu par call et
// LTV/CAC une fois assez de volume. Réservé aux coachs (leur propre
// portefeuille, RLS sur coach_id = auth.uid()), pas au seul propriétaire de
// plateforme, contrairement à /admin/leads qui est une donnée plateforme.
export default async function SalesCallsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const calls = await getMySalesCalls();

  const known = calls.filter((c) => c.show_up !== null);
  const shownUp = calls.filter((c) => c.show_up === true);
  const closed = calls.filter((c) => c.closed === true);
  const revenue = calls.reduce((sum, c) => sum + (c.revenue_amount ?? 0), 0);
  const showUpRate = known.length > 0 ? Math.round((shownUp.length / known.length) * 100) : null;
  const closingRate = shownUp.length > 0 ? Math.round((closed.length / shownUp.length) * 100) : null;
  const revenuePerCall = calls.length > 0 ? Math.round(revenue / calls.length) : null;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <Link
        href="/dashboard/coach"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Retour
      </Link>

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Vente
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Appels de vente</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Un appel = une ligne. Coche show up et closing une fois l&apos;appel passé, note le CA si signé.
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-8" style={{ WebkitOverflowScrolling: "touch" }}>
        <StatCard label="Appels bookés" value={String(calls.length)} />
        <StatCard label="Show up" value={showUpRate !== null ? `${showUpRate}%` : "···"} sub={`${shownUp.length}/${known.length}`} color="#60a5fa" />
        <StatCard label="Closing" value={closingRate !== null ? `${closingRate}%` : "···"} sub={`${closed.length}/${shownUp.length}`} color="#4ade80" />
        <StatCard label="CA total" value={`${revenue.toLocaleString("fr-FR")}€`} color="#E01E1E" />
        <StatCard label="CA / appel" value={revenuePerCall !== null ? `${revenuePerCall}€` : "···"} />
      </div>

      {calls.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <PhoneCall size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucun appel enregistré pour l&apos;instant.</p>
        </div>
      ) : null}

      <SalesCallsTable calls={calls} />
    </div>
  );
}
