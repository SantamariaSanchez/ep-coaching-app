import Link from "next/link";
import {
  ChevronRight, Clock, ListChecks, HelpCircle, BookOpen, Hash, type LucideIcon,
} from "lucide-react";
import type { LeadMagnet } from "@/lib/lead-magnets";
import { getMagnetIcon } from "@/components/ressources/lead-magnet-icons";

const FORMAT_LABELS: Record<LeadMagnet["format"], { label: string; icon: LucideIcon }> = {
  guide: { label: "Guide", icon: BookOpen },
  checklist: { label: "Checklist", icon: ListChecks },
  quiz: { label: "Quiz", icon: HelpCircle },
};

// Grille de cartes pour les lead magnets (guides/checklists/quiz, voir
// lib/lead-magnets.ts) — partagée entre la page publique /ressources et les
// pages Ressources du dashboard (client et coach), pour que le contenu ne
// vive pas QUE sur la page marketing hors connexion.
export default function LeadMagnetsGrid({
  magnets,
  eyebrow = "Gratuit",
  title = "Guides, checklists et quiz",
}: {
  magnets: LeadMagnet[];
  eyebrow?: string;
  title?: string;
}) {
  if (magnets.length === 0) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">{eyebrow}</p>
      <h2 style={{ fontSize: 18, fontWeight: 900, color: "#F5EDED", margin: "0 0 14px" }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        {magnets.map((m) => {
          const Icon = getMagnetIcon(m.icon);
          const format = FORMAT_LABELS[m.format];
          const FormatIcon = format.icon;
          return (
            <Link
              key={m.slug}
              href={`/ressources/${m.slug}`}
              className="group"
              style={{
                display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 14,
                background: "#1f0101", border: "1px solid rgba(137,4,4,0.25)", textDecoration: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: "rgba(224,30,30,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Icon size={16} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {/* Code CTA reels, voir /ressources : même identifiant que
                      celui à taper dans la recherche publique. */}
                  <span
                    style={{
                      display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 800,
                      color: "rgba(245,237,237,0.3)", fontVariantNumeric: "tabular-nums",
                    }}
                    title="Code à utiliser dans un reel pour renvoyer directement ici"
                  >
                    <Hash size={9} />{m.keyword}
                  </span>
                  <span
                    style={{
                      display: "flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 800,
                      letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)",
                    }}
                  >
                    <FormatIcon size={10} /> {format.label}
                  </span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13.5, fontWeight: 800, color: "#F5EDED", lineHeight: 1.35, margin: "0 0 4px" }}>
                  {m.title}
                </p>
                <p style={{ fontSize: 11, color: "rgba(245,237,237,0.4)", lineHeight: 1.5, margin: 0 }}>{m.hook}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(245,237,237,0.3)" }}>
                  <Clock size={10} /> {m.readTime}
                </span>
                <ChevronRight size={14} className="text-[#F5EDED]/20 group-hover:text-[#E01E1E] transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
