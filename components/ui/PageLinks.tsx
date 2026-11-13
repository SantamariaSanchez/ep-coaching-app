import Link from "next/link";
import { BookOpen, Trophy, Map, Bell, CalendarCheck, Footprints, Brain, Image as ImageIcon } from "lucide-react";

// Petits boutons vers les pages retirées du menu (audit 2026-11-13) :
// Logbook et Performances depuis Programme, Road map et Rappels depuis
// Agenda, Steps et Mindset depuis Sommeil, Photos depuis Check-in.
const ICONS = { logbook: BookOpen, performances: Trophy, roadmap: Map, rappels: Bell, semaine: CalendarCheck, steps: Footprints, mindset: Brain, photos: ImageIcon } as const;
export type PageLinkKind = keyof typeof ICONS;

export default function PageLinks({ links }: { links: { kind: PageLinkKind; label: string; href: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, marginBottom: 14 }}>
      {links.map(({ kind, label, href }) => {
        const Icon = ICONS[kind];
        return (
          <Link
            key={href}
            href={href}
            className="ep-press"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: "0 13px", borderRadius: 999, flexShrink: 0,
              background: "rgba(var(--ep-ink-rgb),0.04)", border: "1px solid rgba(var(--ep-line-rgb),0.25)",
              color: "var(--ep-ink)", fontSize: 12.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            <Icon size={14} strokeWidth={1.9} style={{ color: "var(--ep-accent)" }} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
