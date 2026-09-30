"use client";

import Link from "next/link";
import { Search, ChevronRight, Lock } from "lucide-react";
import { COACH_SIDEBAR, CLIENT_SIDEBAR, ADMIN_SIDEBAR_ITEMS, type SidebarGroup } from "@/components/ui/DashboardNav";

// Onglet « Plus » (navigation téléphone, 2026-09-30) : tout ce qui n'a pas
// son propre onglet, rangé par rubrique, avec la recherche en tête.

const COACH_GROUPS = ["Bibliothèque", "Science", "Communauté", "Compte"];
const CLIENT_GROUPS = ["Contenu", "Science", "Communauté", "Compte"];

export default function PlusMenu({ space, hidden, isFounder, isFreeTier }: { space: "coach" | "client"; hidden: string[]; isFounder: boolean; isFreeTier: boolean }) {
  const base = `/dashboard/${space}`;
  const hiddenSet = new Set(hidden);
  const source = space === "coach" ? COACH_SIDEBAR : CLIENT_SIDEBAR;
  const wanted = space === "coach" ? COACH_GROUPS : CLIENT_GROUPS;
  const groups: SidebarGroup[] = [
    ...(space === "coach" && isFounder ? [{ group: "Administration", items: ADMIN_SIDEBAR_ITEMS }] : []),
    ...wanted.map((name) => source.find((g) => g.group === name)).filter((g): g is SidebarGroup => !!g),
  ]
    .map((g) => ({ ...g, items: g.items.filter((i) => !hiddenSet.has(i.segment)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="page-transition" style={{ padding: "24px 16px 110px", maxWidth: 720, margin: "0 auto" }}>
      <h1 className="ep-h1" style={{ marginBottom: 14 }}>Plus</h1>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("ep:open-search"))}
        className="ep-card"
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", marginBottom: 20, cursor: "pointer", color: "rgba(245,237,237,0.5)", fontSize: 14, textAlign: "left" }}
      >
        <Search size={17} /> Rechercher une page, un client, une info...
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {groups.map((g) => (
          <section key={g.group}>
            <p className="ep-label" style={{ margin: "0 0 8px 2px" }}>{g.group}</p>
            <div className="ep-card" style={{ padding: 0, overflow: "hidden" }}>
              {g.items.map((item, idx) => {
                const Icon = item.icon;
                const href = item.href ?? (item.segment ? `${base}/${item.segment}` : base);
                const locked = item.locked || (item.freeLocked && isFreeTier);
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px", minHeight: 52, textDecoration: "none", color: "#F5EDED", borderTop: idx ? "1px solid rgba(245,237,237,0.06)" : "none" }}
                  >
                    <span style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(224,30,30,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} style={{ color: "#E01E1E" }} />
                    </span>
                    <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700 }}>{item.label}</span>
                    {locked && <Lock size={13} style={{ color: "rgba(245,237,237,0.35)" }} />}
                    <ChevronRight size={16} style={{ color: "rgba(245,237,237,0.25)" }} />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
