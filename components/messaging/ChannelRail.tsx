"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hash, MessageCircle, Megaphone, Trophy, HelpCircle, Video, Users, BarChart3 } from "lucide-react";

// Messages en « serveur » (audit 2026-11-13) : une barre de salons en haut de
// la messagerie, comme un serveur Discord. Les salons pointent vers les
// espaces qui existent déjà (conversation privée, annonces du coach,
// victoires, questions, classement, lives), sans les dupliquer.
type Channel = { href: string; label: string; icon: React.ElementType; match?: string };

const CLIENT: Channel[] = [
  { href: "/dashboard/client/messages", label: "coach", icon: MessageCircle },
  { href: "/dashboard/client/communaute/coach", label: "annonces", icon: Megaphone },
  { href: "/dashboard/client/communaute/victoires", label: "victoires", icon: Trophy },
  { href: "/dashboard/client/communaute/questions", label: "questions", icon: HelpCircle },
  { href: "/dashboard/client/communaute/classement", label: "classement", icon: BarChart3 },
  { href: "/dashboard/client/live", label: "lives", icon: Video },
];

const COACH: Channel[] = [
  { href: "/dashboard/coach/messages", label: "privés", icon: MessageCircle },
  { href: "/dashboard/coach/communaute/coach", label: "annonces", icon: Megaphone },
  { href: "/dashboard/coach/communaute/victoires", label: "victoires", icon: Trophy },
  { href: "/dashboard/coach/communaute/questions", label: "questions", icon: HelpCircle },
  { href: "/dashboard/coach/communaute/membres", label: "membres", icon: Users },
  { href: "/dashboard/coach/live", label: "lives", icon: Video },
];

export default function ChannelRail({ space, unread = 0 }: { space: "client" | "coach"; unread?: number }) {
  const pathname = usePathname();
  const list = space === "coach" ? COACH : CLIENT;
  return (
    <nav aria-label="Salons" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 12px", borderBottom: "1px solid rgba(var(--ep-line-rgb),0.2)" }}>
      {list.map((c, i) => {
        const active = i === 0 ? pathname === c.href || pathname.startsWith(`${c.href}/`) : pathname.startsWith(c.href);
        const Icon = c.icon;
        return (
          <Link
            key={c.href}
            href={c.href}
            aria-current={active ? "page" : undefined}
            className="ep-press"
            style={{
              position: "relative", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, minHeight: 36, padding: "0 11px",
              borderRadius: 10, fontSize: 12.5, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap",
              background: active ? "rgba(var(--ep-accent-rgb),0.16)" : "transparent",
              color: active ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.55)",
            }}
          >
            {i === 0 ? <Icon size={13} /> : <Hash size={13} style={{ opacity: 0.6 }} />}
            {c.label}
            {i === 0 && unread > 0 && (
              <span style={{ minWidth: 17, height: 17, padding: "0 5px", borderRadius: 999, background: "var(--ep-accent)", color: "var(--ep-strong)", fontSize: 10, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
