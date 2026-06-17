"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home, Users, ClipboardCheck, LogOut, Dumbbell, Apple,
  ClipboardList, TrendingUp, User, Image, BookOpen,
  MessageCircle, BarChart2, Map,
} from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";
import { EPLogo } from "@/components/ui/EPLogo";

// ── Types ──────────────────────────────────────────────────────────────────────

type BadgeKey = "pending" | "messages" | "analytics";

type TabItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  matchSegments: string[];
  exactMatch?: boolean;
  badge?: BadgeKey;
};

type SidebarGroup = {
  group: string;
  items: Array<{
    label: string;
    icon: React.ElementType;
    segment: string;
    badge?: BadgeKey;
  }>;
};

// ── Navigation data ─────────────────────────────────────────────────────────

const CLIENT_TABS: TabItem[] = [
  {
    label: "Aujourd'hui",
    icon: Home,
    href: "/dashboard/client",
    matchSegments: [],
    exactMatch: true,
  },
  {
    label: "Training",
    icon: Dumbbell,
    href: "/dashboard/client/program",
    matchSegments: ["program", "logbook"],
  },
  {
    label: "Suivi",
    icon: TrendingUp,
    href: "/dashboard/client/progress",
    matchSegments: ["measurements", "photos", "nutrition", "progress", "roadmap"],
  },
  {
    label: "Coach",
    icon: MessageCircle,
    href: "/dashboard/client/messages",
    matchSegments: ["messages", "checkin", "reminders", "profile"],
    badge: "messages",
  },
];

const COACH_TABS: TabItem[] = [
  {
    label: "Aujourd'hui",
    icon: Home,
    href: "/dashboard/coach",
    matchSegments: [],
    exactMatch: true,
  },
  {
    label: "Clients",
    icon: Users,
    href: "/dashboard/coach/clients",
    matchSegments: ["clients"],
    badge: "pending",
  },
  {
    label: "Messages",
    icon: MessageCircle,
    href: "/dashboard/coach/messages",
    matchSegments: ["messages"],
    badge: "messages",
  },
  {
    label: "Analytics",
    icon: BarChart2,
    href: "/dashboard/coach/analytics",
    matchSegments: ["analytics", "bilan", "notes", "nutrition"],
    badge: "analytics",
  },
];

const COACH_SIDEBAR: SidebarGroup[] = [
  {
    group: "",
    items: [{ label: "Tableau de bord", icon: Home, segment: "" }],
  },
  {
    group: "Gestion",
    items: [
      { label: "Clients",  icon: Users,         segment: "clients",   badge: "pending" },
      { label: "Messages", icon: MessageCircle, segment: "messages",  badge: "messages" },
    ],
  },
  {
    group: "Analyse",
    items: [
      { label: "Analytics", icon: BarChart2,      segment: "analytics", badge: "analytics" },
      { label: "Bilan",     icon: ClipboardCheck, segment: "bilan",     badge: "pending" },
      { label: "Nutrition", icon: Apple,           segment: "nutrition" },
    ],
  },
];

const CLIENT_SIDEBAR: SidebarGroup[] = [
  {
    group: "",
    items: [{ label: "Aujourd'hui", icon: Home, segment: "" }],
  },
  {
    group: "Training",
    items: [
      { label: "Programme", icon: Dumbbell,  segment: "program" },
      { label: "Logbook",   icon: BookOpen,  segment: "logbook" },
      { label: "Road Map",  icon: Map,       segment: "roadmap" },
    ],
  },
  {
    group: "Suivi",
    items: [
      { label: "Progression",  icon: TrendingUp, segment: "progress" },
      { label: "Nutrition",    icon: Apple,      segment: "nutrition" },
      { label: "Mensurations", icon: User,       segment: "measurements" },
      { label: "Photos",       icon: Image,      segment: "photos" },
    ],
  },
  {
    group: "Coach",
    items: [
      { label: "Messages", icon: MessageCircle, segment: "messages", badge: "messages" },
      { label: "Check-in", icon: ClipboardList, segment: "checkin" },
      { label: "Profil",   icon: User,          segment: "profile" },
    ],
  },
];

// ── Hook ────────────────────────────────────────────────────────────────────

function useNavState() {
  const pathname = usePathname();
  const isCoach = pathname.startsWith("/dashboard/coach");
  const base = isCoach ? "/dashboard/coach" : "/dashboard/client";
  const tabs = isCoach ? COACH_TABS : CLIENT_TABS;
  const sidebar = isCoach ? COACH_SIDEBAR : CLIENT_SIDEBAR;

  function isTabActive(tab: TabItem): boolean {
    if (tab.exactMatch) return pathname === tab.href;
    return tab.matchSegments.some((seg) =>
      pathname.startsWith(`${base}/${seg}`)
    );
  }

  function isSidebarActive(segment: string): boolean {
    if (segment === "") return pathname === base;
    return pathname.startsWith(`${base}/${segment}`);
  }

  return { isCoach, base, tabs, sidebar, isTabActive, isSidebarActive };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DashboardNav() {
  const { isCoach, base, tabs, sidebar, isTabActive, isSidebarActive } =
    useNavState();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);

  const [pendingCount,    setPendingCount]    = useState(0);
  const [unreadMessages,  setUnreadMessages]  = useState(0);
  const [analyticsAlerts, setAnalyticsAlerts] = useState(0);
  const [userName,        setUserName]        = useState<string | null>(null);
  const [userRole,        setUserRole]        = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    const prefetch = isCoach
      ? ["/dashboard/coach", "/dashboard/coach/clients", "/dashboard/coach/analytics", "/dashboard/coach/messages"]
      : ["/dashboard/client", "/dashboard/client/program", "/dashboard/client/progress", "/dashboard/client/messages"];
    prefetch.forEach((p) => router.prefetch(p));
  }, [isCoach, router]);

  useEffect(() => {
    if (isCoach) {
      fetch("/api/coach/pending-count")
        .then((r) => r.json())
        .then((d) => setPendingCount(d.count ?? 0))
        .catch(() => {});
      fetch("/api/coach/analytics-alerts")
        .then((r) => r.json())
        .then((d) => setAnalyticsAlerts(d.count ?? 0))
        .catch(() => {});
    }
  }, [isCoach]);

  useEffect(() => {
    fetch("/api/messages/unread")
      .then((r) => r.json())
      .then((d) => setUnreadMessages(d.count ?? 0))
      .catch(() => {});

    const supabase = createClientSupabase();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setUserName((data as { full_name: string | null }).full_name);
            setUserRole((data as { role: string }).role);
          }
        });
    });

    const ch = supabase
      .channel("nav-msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () =>
        fetch("/api/messages/unread").then((r) => r.json()).then((d) => setUnreadMessages(d.count ?? 0)).catch(() => {})
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () =>
        fetch("/api/messages/unread").then((r) => r.json()).then((d) => setUnreadMessages(d.count ?? 0)).catch(() => {})
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function handleSignOut() {
    const supabase = createClientSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function getBadgeCount(badge?: BadgeKey): number {
    if (badge === "pending")   return pendingCount;
    if (badge === "messages")  return unreadMessages;
    if (badge === "analytics") return analyticsAlerts;
    return 0;
  }

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "EP";

  // ── Desktop sidebar ─────────────────────────────────────────────────────────
  return (
    <>
      <aside
        style={{
          display: isDesktop ? "flex" : "none",
          flexDirection: "column",
          position: "fixed",
          left: 0, top: 0,
          height: "100%",
          zIndex: 40,
          width: 220,
          background: "rgba(6,0,0,0.88)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderRight: "1px solid rgba(224,30,30,0.1)",
          boxShadow: "4px 0 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 28, paddingBottom: 24 }}>
          <EPLogo size="md" showCoaching />
        </div>

        <div className="ep-divider-subtle" style={{ margin: "0 16px 8px" }} />

        {/* Sidebar nav */}
        <nav style={{ flex: 1, padding: "0 10px", overflowY: "auto" }}>
          {sidebar.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 4 }}>
              {group.group && (
                <p style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(245,237,237,0.18)",
                  padding: "14px 10px 5px",
                  margin: 0,
                }}>
                  {group.group}
                </p>
              )}
              {group.items.map(({ label, icon: Icon, segment, badge }, i) => {
                const active = isSidebarActive(segment);
                const href = segment ? `${base}/${segment}` : base;
                const count = getBadgeCount(badge);
                return (
                  <Link
                    key={href}
                    href={href}
                    className="animate-fade-up"
                    style={{
                      animationDelay: `${(gi * 3 + i) * 30}ms`,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: 10,
                      marginBottom: 1,
                      background: active ? "rgba(224,30,30,0.1)" : "transparent",
                      color: active ? "#F5EDED" : "rgba(245,237,237,0.32)",
                      fontWeight: active ? 700 : 500,
                      fontSize: 13,
                      borderLeft: active ? "2px solid #E01E1E" : "2px solid transparent",
                      marginLeft: active ? -2 : 0,
                      transition: "all 0.15s ease",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (active) return;
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = "rgba(224,30,30,0.05)";
                      el.style.color = "rgba(245,237,237,0.65)";
                    }}
                    onMouseLeave={(e) => {
                      if (active) return;
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = "transparent";
                      el.style.color = "rgba(245,237,237,0.32)";
                    }}
                  >
                    <Icon
                      size={16}
                      strokeWidth={active ? 2.2 : 1.7}
                      style={{ color: active ? "#E01E1E" : "inherit", flexShrink: 0 }}
                    />
                    <span style={{ flex: 1 }}>{label}</span>
                    {count > 0 && (
                      <span
                        className={count > 0 ? "animate-pulse-glow" : ""}
                        style={{
                          background: "#E01E1E",
                          color: "#fff",
                          borderRadius: "50%",
                          width: 16,
                          height: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: user + logout */}
        <div style={{ borderTop: "1px solid rgba(224,30,30,0.08)", padding: "14px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, #E01E1E, #890404)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "#F5EDED",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(224,30,30,0.25)",
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#F5EDED",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {userName ?? "…"}
              </div>
              <div style={{
                fontSize: 10,
                color: "rgba(245,237,237,0.28)",
                textTransform: "capitalize",
              }}>
                {userRole ?? "—"}
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "7px 10px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "rgba(245,237,237,0.22)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "#E01E1E";
              el.style.background = "rgba(224,30,30,0.07)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "rgba(245,237,237,0.22)";
              el.style.background = "transparent";
            }}
          >
            <LogOut size={14} strokeWidth={1.7} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav — Oura style ─────────────────────────────────── */}
      <nav
        className="ep-bottom-nav"
        style={{ display: isDesktop ? "none" : "block" }}
      >
        <div style={{
          display: "flex",
          alignItems: "stretch",
          padding: "6px 8px 8px",
          height: 72,
          gap: 4,
        }}>
          {tabs.map((tab) => {
            const active = isTabActive(tab);
            const Icon = tab.icon;
            const count = getBadgeCount(tab.badge);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  textDecoration: "none",
                  borderRadius: 12,
                  transition: "background 0.15s",
                  minHeight: 56,
                  position: "relative",
                }}
              >
                {/* Icon container with pill */}
                <div
                  style={{
                    position: "relative",
                    width: 48,
                    height: 30,
                    borderRadius: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active
                      ? "rgba(224,30,30,0.14)"
                      : "transparent",
                    transition: "background 0.2s ease",
                  }}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.3 : 1.6}
                    style={{
                      color: active ? "#E01E1E" : "rgba(245,237,237,0.28)",
                      transition: "color 0.2s, stroke-width 0.2s",
                    }}
                  />
                  {count > 0 && (
                    <span style={{
                      position: "absolute",
                      top: 1,
                      right: 3,
                      background: "#E01E1E",
                      color: "#fff",
                      borderRadius: "50%",
                      width: 15,
                      height: 15,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8,
                      fontWeight: 800,
                      border: "1.5px solid #070000",
                    }}>
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span style={{
                  fontSize: 9,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: "0.03em",
                  color: active ? "#E01E1E" : "rgba(245,237,237,0.28)",
                  transition: "color 0.2s",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
