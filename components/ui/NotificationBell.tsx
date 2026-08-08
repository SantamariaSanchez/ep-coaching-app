"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";
import { roleBadge } from "@/utils/auth-client";
import RoleBadge from "@/components/ui/RoleBadge";
import { safeExternalUrl } from "@/lib/sanitize";

interface NotificationSender {
  full_name: string | null;
  role: "coach" | "client";
  is_platform_owner: boolean;
  subscription_status: "free" | "active" | "canceled";
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: string | null;
  created_at: string;
  sender: NotificationSender | null;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

export default function NotificationBell({
  variant = "desktop",
  openUpward = false,
  alignLeft = false,
}: {
  variant?: "desktop" | "mobile";
  /** Panneau ouvert vers le haut plutôt que vers le bas — pour un déclencheur ancré en bas d'écran */
  openUpward?: boolean;
  /** Panneau aligné sur le bord gauche du déclencheur plutôt que le droit */
  alignLeft?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  function refreshCount() {
    fetch("/api/notifications/unread")
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? 0))
      .catch(() => {});
  }

  useEffect(() => {
    refreshCount();

    const supabase = createClientSupabase();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      channel = supabase
        .channel("nav-notifications")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          () => refreshCount()
        )
        .subscribe();
    });

    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      if (!loaded) {
        const res = await fetch("/api/notifications");
        const json = await res.json();
        setItems(json.notifications ?? []);
        setLoaded(true);
      }
      if (count > 0) {
        await fetch("/api/notifications/read", { method: "POST" });
        setCount(0);
        setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      }
    }
  }

  const size = variant === "mobile" ? 18 : 16;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="ep-btn-icon"
        style={{
          position: "relative",
          width: variant === "mobile" ? 36 : 32,
          height: variant === "mobile" ? 36 : 32,
          background: open ? "rgba(224,30,30,0.12)" : "rgba(245,237,237,0.04)",
        }}
      >
        <Bell size={size} strokeWidth={1.8} style={{ color: count > 0 ? "#E01E1E" : "rgba(245,237,237,0.5)" }} />
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#E01E1E",
              color: "#fff",
              borderRadius: "50%",
              minWidth: 16,
              height: 16,
              padding: "0 3px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 800,
              border: "1.5px solid #070000",
            }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="ep-popover"
          style={{
            position: "absolute",
            ...(openUpward ? { bottom: "calc(100% + 8px)" } : { top: "calc(100% + 8px)" }),
            ...(alignLeft ? { left: 0 } : { right: 0 }),
            // Le panneau s'ouvre depuis le coin où vit la cloche, pas depuis
            // le centre — sinon l'échelle d'entrée "grandit" visuellement
            // depuis un point qui n'a aucun rapport avec le déclencheur.
            transformOrigin: `${openUpward ? "bottom" : "top"} ${alignLeft ? "left" : "right"}`,
            width: 320,
            maxHeight: 420,
            overflowY: "auto",
            background: "rgba(8,0,0,0.97)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(224,30,30,0.18)",
            borderRadius: 14,
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid rgba(224,30,30,0.1)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#F5EDED" }}>
              Notifications
            </span>
            <CheckCheck size={13} style={{ color: "rgba(245,237,237,0.25)" }} />
          </div>

          {items.length === 0 ? (
            <p style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: "rgba(245,237,237,0.3)" }}>
              Rien pour l&apos;instant.
            </p>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                href={safeExternalUrl(n.url) ?? "#"}
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(224,30,30,0.06)",
                  textDecoration: "none",
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: "#F5EDED", margin: 0 }}>{n.title}</p>
                {n.sender?.full_name && (
                  <p style={{ display: "flex", alignItems: "center", gap: 5, margin: "3px 0 0" }}>
                    <span style={{ fontSize: 10.5, color: "rgba(245,237,237,0.4)", fontWeight: 600 }}>
                      {n.sender.full_name.split(" ")[0]}
                    </span>
                    <RoleBadge label={roleBadge(n.sender)} />
                  </p>
                )}
                {n.body && (
                  <p style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", margin: "2px 0 0" }}>{n.body}</p>
                )}
                <p style={{ fontSize: 9, color: "rgba(245,237,237,0.22)", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {timeAgo(n.created_at)}
                </p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
