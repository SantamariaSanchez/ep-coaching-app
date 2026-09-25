"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Contact,
  ListChecks,
  Clapperboard,
  Megaphone,
  LifeBuoy,
  Rocket,
  Wallet,
  UserSearch,
  ClipboardCheck,
  HeartHandshake,
  Sparkles,
  Workflow,
  FileBarChart,
  MessageSquareQuote,
  Users,
  FileSignature,
  UserCog,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import NotificationBell from "@/components/ui/NotificationBell";
import { createClientSupabase } from "@/lib/supabase-client";
import type { ModuleKey } from "@/lib/staff-roles";

const ICONS: Record<ModuleKey, LucideIcon> = {
  agenda: CalendarDays,
  crm: Contact,
  taches: ListChecks,
  livrables: Clapperboard,
  campagnes: Megaphone,
  tickets: LifeBuoy,
  backlog: Rocket,
  finance: Wallet,
  recrutement: UserSearch,
  audits: ClipboardCheck,
  clients: HeartHandshake,
  opportunites: Sparkles,
  process: Workflow,
  rapports: FileBarChart,
  scripts: MessageSquareQuote,
  equipe: Users,
};

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export default function StaffShell({
  fullName,
  roleTitle,
  poleName,
  poleColor,
  modules,
  unlocked,
  children,
}: {
  fullName: string;
  roleTitle: string;
  poleName: string;
  poleColor: string;
  modules: { key: ModuleKey; label: string }[];
  unlocked: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const items: NavItem[] = unlocked
    ? [
        { href: "/equipe", label: "Tableau de bord", icon: LayoutDashboard },
        ...modules.map((m) => ({ href: `/equipe/${m.key}`, label: m.label, icon: ICONS[m.key] })),
        { href: "/equipe/poste", label: "Mon poste et contrat", icon: FileSignature },
        { href: "/equipe/compte", label: "Mon compte", icon: UserCog },
      ]
    : [];

  const isActive = (href: string) => (href === "/equipe" ? pathname === "/equipe" : pathname.startsWith(href));

  async function logout() {
    const supabase = createClientSupabase();
    await supabase.auth.signOut();
    router.push("/auth/equipe");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0D0000" }}>
      {/* Barre latérale desktop */}
      <aside
        className="hidden md:flex"
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 232, flexDirection: "column",
          background: "linear-gradient(180deg, #1a0101 0%, #0D0000 100%)",
          borderRight: "1px solid rgba(137,4,4,0.25)", padding: "22px 14px", zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <EPLogo size="sm" showCoaching />
          {unlocked && <NotificationBell variant="desktop" />}
        </div>
        <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(224,30,30,0.06)", border: "1px solid rgba(137,4,4,0.3)", marginBottom: 16 }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: poleColor, margin: "0 0 3px" }}>{poleName}</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#F5EDED", margin: "0 0 2px", lineHeight: 1.25 }}>{roleTitle}</p>
          <p style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", margin: 0 }}>{fullName}</p>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, overflowY: "auto" }} aria-label="Espace équipe">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10,
                  fontSize: 12.5, fontWeight: active ? 800 : 600, textDecoration: "none",
                  color: active ? "#F5EDED" : "rgba(245,237,237,0.55)",
                  background: active ? "rgba(224,30,30,0.14)" : "transparent",
                  border: `1px solid ${active ? "rgba(224,30,30,0.35)" : "transparent"}`,
                }}
              >
                <Icon size={15} style={{ color: active ? "#E01E1E" : "rgba(245,237,237,0.4)" }} />
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={logout}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "none", border: "none", color: "rgba(245,237,237,0.35)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          <LogOut size={14} /> Déconnexion
        </button>
      </aside>

      {/* En-tête et navigation mobile */}
      <header className="md:hidden" style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(13,0,0,0.96)", borderBottom: "1px solid rgba(137,4,4,0.25)", backdropFilter: "blur(10px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: poleColor, margin: 0 }}>{poleName}</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#F5EDED", margin: 0 }}>{roleTitle}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {unlocked && <NotificationBell variant="mobile" />}
            <button type="button" onClick={logout} aria-label="Déconnexion" style={{ background: "none", border: "none", color: "rgba(245,237,237,0.45)", cursor: "pointer", padding: 6 }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
        {items.length > 0 && (
          <nav style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 12px 10px" }} aria-label="Espace équipe">
            {items.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  style={{
                    flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 999,
                    fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
                    color: active ? "#F5EDED" : "rgba(245,237,237,0.5)",
                    background: active ? "rgba(224,30,30,0.16)" : "rgba(245,237,237,0.03)",
                    border: `1px solid ${active ? "rgba(224,30,30,0.4)" : "rgba(245,237,237,0.08)"}`,
                  }}
                >
                  <Icon size={12} />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="md:pl-[232px]">
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 16px 96px" }}>{children}</div>
      </main>
    </div>
  );
}
