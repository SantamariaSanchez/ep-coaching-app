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

// ── Nav items ─────────────────────────────────────────────────────────────────

const COACH_ITEMS = [
  { label: "Accueil",   icon: Home,          segment: "" },
  { label: "Clients",   icon: Users,         segment: "clients" },
  { label: "Nutrition", icon: Apple,         segment: "nutrition" },
  { label: "Analytics", icon: BarChart2,     segment: "analytics" },
  { label: "Bilan",     icon: ClipboardCheck,segment: "bilan" },
  { label: "Messages",  icon: MessageCircle, segment: "messages" },
];

const CLIENT_ITEMS = [
  { label: "Accueil",    icon: Home,          segment: "" },
  { label: "Road Map",   icon: Map,           segment: "roadmap" },
  { label: "Programme",  icon: Dumbbell,      segment: "program" },
  { label: "Logbook",    icon: BookOpen,      segment: "logbook" },
  { label: "Nutrition",  icon: Apple,         segment: "nutrition" },
  { label: "Check-in",   icon: ClipboardList, segment: "checkin" },
  { label: "Photos",     icon: Image,         segment: "photos" },
  { label: "Messages",   icon: MessageCircle, segment: "messages" },
  { label: "Progrès",    icon: TrendingUp,    segment: "progress" },
  { label: "Profil",     icon: User,          segment: "profile" },
];

const COACH_MOBILE  = ["", "clients", "analytics", "bilan", "messages"];
const CLIENT_MOBILE = ["", "logbook", "nutrition", "checkin", "messages"];

function useNavState() {
  const pathname = usePathname();
  const isCoach  = pathname.startsWith("/dashboard/coach");
  const base     = isCoach ? "/dashboard/coach" : "/dashboard/client";
  const items    = isCoach ? COACH_ITEMS : CLIENT_ITEMS;
  const mobile   = isCoach ? COACH_MOBILE : CLIENT_MOBILE;

  return {
    isCoach, base,
    navItems: items.map((item) => ({
      ...item,
      href: item.segment ? `${base}/${item.segment}` : base,
      active: item.segment
        ? pathname.startsWith(`${base}/${item.segment}`)
        : pathname === base,
    })),
    mobileItems: items
      .filter((i) => mobile.includes(i.segment))
      .map((item) => ({
        ...item,
        href: item.segment ? `${base}/${item.segment}` : base,
        active: item.segment
          ? pathname.startsWith(`${base}/${item.segment}`)
          : pathname === base,
      })),
  };
}

export default function DashboardNav() {
  const { isCoach, navItems, mobileItems } = useNavState();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const [pendingCount,    setPendingCount]    = useState(0);
  const [unreadMessages,  setUnreadMessages]  = useState(0);
  const [analyticsAlerts, setAnalyticsAlerts] = useState(0);
  const [userName,        setUserName]        = useState<string | null>(null);
  const [userRole,        setUserRole]        = useState<string | null>(null);

  // ── Prefetch key routes ────────────────────────────────────────────────────
  useEffect(() => {
    const prefetch = isCoach
      ? ["/dashboard/coach", "/dashboard/coach/clients", "/dashboard/coach/bilan", "/dashboard/coach/analytics"]
      : ["/dashboard/client", "/dashboard/client/logbook", "/dashboard/client/nutrition", "/dashboard/client/messages"];
    prefetch.forEach((p) => router.prefetch(p));
  }, [isCoach, router]);

  // ── Badge counts ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isCoach) {
      fetch("/api/coach/pending-count").then((r) => r.json()).then((d) => setPendingCount(d.count ?? 0)).catch(() => {});
      fetch("/api/coach/analytics-alerts").then((r) => r.json()).then((d) => setAnalyticsAlerts(d.count ?? 0)).catch(() => {});
    }
  }, [isCoach]);

  useEffect(() => {
    fetch("/api/messages/unread").then((r) => r.json()).then((d) => setUnreadMessages(d.count ?? 0)).catch(() => {});

    const supabase = createClientSupabase();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("full_name, role").eq("id", user.id).single()
        .then(({ data }) => {
          if (data) {
            setUserName((data as { full_name: string | null }).full_name);
            setUserRole((data as { role: string }).role);
          }
        });
    });

    const ch = supabase.channel("nav-msgs")
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

  function badgeFor(segment: string): number {
    if (segment === "bilan"     && isCoach) return pendingCount;
    if (segment === "analytics" && isCoach) return analyticsAlerts;
    if (segment === "messages")             return unreadMessages;
    return 0;
  }

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "EP";

  // ── Desktop sidebar ────────────────────────────────────────────────────────
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
          background: "#0A0000",
          borderRight: "1px solid rgba(224,30,30,0.1)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 28, paddingBottom: 20 }}>
          <EPLogo size="md" showCoaching />
        </div>

        {/* Top separator */}
        <div className="ep-divider" style={{ margin: "0 16px" }} />

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "8px", overflowY: "auto" }}>
          {navItems.map(({ label, icon: Icon, href, active, segment }, i) => {
            const count = badgeFor(segment);
            return (
              <Link
                key={href}
                href={href}
                className="animate-fade-up"
                style={{
                  animationDelay: `${i * 40}ms`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 8,
                  marginBottom: 2,
                  marginLeft: active ? -2 : 0,
                  borderLeft: active
                    ? "2px solid #E01E1E"
                    : "2px solid transparent",
                  background: active
                    ? "rgba(224,30,30,0.1)"
                    : "transparent",
                  color: active ? "#F5EDED" : "rgba(245,237,237,0.3)",
                  fontWeight: active ? 700 : 600,
                  fontSize: 13,
                  letterSpacing: "0.01em",
                  transition: "all 0.15s ease",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  if (active) return;
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "rgba(224,30,30,0.06)";
                  el.style.borderLeft = "2px solid rgba(224,30,30,0.5)";
                  el.style.marginLeft = "-2px";
                  el.style.color = "rgba(245,237,237,0.8)";
                }}
                onMouseLeave={(e) => {
                  if (active) return;
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "transparent";
                  el.style.borderLeft = "2px solid transparent";
                  el.style.marginLeft = "0";
                  el.style.color = "rgba(245,237,237,0.3)";
                }}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.8}
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
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
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
        </nav>

        {/* Bottom: user info + logout */}
        <div style={{ borderTop: "1px solid rgba(224,30,30,0.1)", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #E01E1E, #890404)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                color: "#F5EDED",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F5EDED", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userName ?? "…"}
              </div>
              <div style={{ fontSize: 10, color: "rgba(245,237,237,0.35)", textTransform: "capitalize" }}>
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
              padding: "8px 10px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "rgba(245,237,237,0.3)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "#E01E1E";
              el.style.background = "rgba(224,30,30,0.06)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "rgba(245,237,237,0.3)";
              el.style.background = "transparent";
            }}
          >
            <LogOut size={15} strokeWidth={1.8} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ──────────────────────────────────────────────── */}
      <nav
        style={{
          display: isDesktop ? "none" : "block",
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          zIndex: 40,
          background: "#0A0000",
          borderTop: "1px solid rgba(224,30,30,0.12)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch", justifyContent: "space-around", padding: "6px 4px 6px" }}>
          {mobileItems.map(({ label, icon: Icon, href, active, segment }) => {
            const count = badgeFor(segment);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  flex: 1,
                  padding: "6px 4px 10px",
                  textDecoration: "none",
                  color: active ? "#E01E1E" : "rgba(245,237,237,0.3)",
                  position: "relative",
                  minHeight: 44,
                  justifyContent: "center",
                }}
              >
                <div style={{ position: "relative" }}>
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                  {count > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -6,
                        background: "#E01E1E",
                        color: "#fff",
                        borderRadius: "50%",
                        width: 14,
                        height: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 8,
                        fontWeight: 800,
                      }}
                    >
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 9, fontWeight: active ? 700 : 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {label}
                </span>
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 16,
                      height: 2,
                      borderRadius: 1,
                      background: "#E01E1E",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
