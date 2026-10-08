import Link from "next/link";
import { Users, Sparkles, BarChart3, GraduationCap, Video, Gauge, UsersRound, SlidersHorizontal } from "lucide-react";

// Raccourcis de l'accueil coach selon ses objectifs "Mon appli" (2026-09-30) :
// chaque coach voit d'abord les outils de SON parcours.

const ALL = [
  { key: "coacher", label: "Mes clients", href: "/dashboard/coach/clients", icon: Users },
  { key: "contenu", label: "Studio créatif", href: "/dashboard/coach/studio", icon: Sparkles },
  { key: "contenu", label: "Mes stats réseaux", href: "/dashboard/coach/stats-reseaux", icon: BarChart3 },
  { key: "formations", label: "Mes formations", href: "/dashboard/coach/formations", icon: GraduationCap },
  { key: "lives", label: "Lives", href: "/dashboard/coach/live", icon: Video },
  { key: "business", label: "Pilotage", href: "/dashboard/coach/business/pilotage", icon: Gauge },
  { key: "equipe", label: "Mon équipe", href: "/dashboard/coach/mon-equipe", icon: UsersRound },
] as const;

export default function CoachShortcuts({ objectives, configured }: { objectives: string[]; configured: boolean }) {
  const items = ALL.filter((i) => objectives.includes(i.key));
  if (!configured || items.length === 0) {
    return (
      <Link href="/dashboard/coach/mon-appli" className="ep-card animate-fade-up" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", marginBottom: 20, textDecoration: "none", color: "rgba(245,237,237,0.8)", fontSize: 13, fontWeight: 700 }}>
        <SlidersHorizontal size={15} style={{ color: "#E01E1E" }} /> Dis-nous tes objectifs : ton accueil mettra en avant tes outils.
      </Link>
    );
  }
  return (
    <div className="animate-fade-up" style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 20, paddingBottom: 2 }}>
      {items.map((i) => {
        const Icon = i.icon;
        return (
          <Link
            key={i.href}
            href={i.href}
            className="ep-card"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 14px", textDecoration: "none", color: "#F5EDED", fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}
          >
            <Icon size={14} style={{ color: "#E01E1E" }} /> {i.label}
          </Link>
        );
      })}
    </div>
  );
}
