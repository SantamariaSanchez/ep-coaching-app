"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, X } from "lucide-react";
import RoleBadge from "@/components/ui/RoleBadge";
import type { RoleBadge as RoleBadgeLabel } from "@/utils/auth-client";

export interface ConversationRow {
  id: string;
  fullName: string | null;
  badge: RoleBadgeLabel;
  lastContent: string | null;
  lastTime: string | null;
  unread: number;
}

// Recherche insensible à la casse et aux accents.
function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type FilterKey = "all" | "unread" | "silent";

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 13px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "all 0.15s ease",
  background: active ? "rgba(224,30,30,0.14)" : "rgba(245,237,237,0.04)",
  border: active ? "1px solid rgba(224,30,30,0.35)" : "1px solid rgba(137,4,4,0.25)",
  color: active ? "#E01E1E" : "rgba(245,237,237,0.45)",
});

export default function CoachConversationsList({ rows }: { rows: ConversationRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const unreadCount = rows.filter((r) => r.unread > 0).length;
  // Membres à qui le coach n'a jamais écrit et qui n'ont jamais écrit non
  // plus : les plus faciles à oublier, alors que ce sont souvent ceux qu'il
  // faut relancer en premier.
  const silentCount = rows.filter((r) => !r.lastContent).length;

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return rows.filter((r) => {
      if (q && !normalize(r.fullName ?? "").includes(q)) return false;
      if (filter === "unread") return r.unread > 0;
      if (filter === "silent") return !r.lastContent;
      return true;
    });
  }, [rows, query, filter]);

  // En dessous de quelques conversations, la liste tient à l'écran : la
  // barre d'outils n'apporterait rien.
  const showToolbar = rows.length > 4;

  return (
    <>
      {showToolbar && (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.28)" }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher un membre"
              aria-label="Chercher un membre"
              style={{
                width: "100%",
                background: "#150000",
                border: "1px solid rgba(137,4,4,0.3)",
                borderRadius: 10,
                padding: "9px 32px 9px 34px",
                fontSize: 13,
                color: "#F5EDED",
                outline: "none",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(245,237,237,0.35)", display: "flex", padding: 0,
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {([
              { key: "all" as const, label: "Tous", count: rows.length },
              { key: "unread" as const, label: "Non lus", count: unreadCount },
              { key: "silent" as const, label: "Jamais échangé", count: silentCount },
            ]).map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={chipStyle(filter === f.key)}>
                {f.label} {f.count > 0 && <span style={{ opacity: 0.65 }}>{f.count}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="ep-card" style={{ padding: "36px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(245,237,237,0.55)", margin: "0 0 4px" }}>
            Aucune conversation ne correspond
          </p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: 0 }}>
            Change de filtre ou vide la recherche pour revoir toute la liste.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((row, i) => {
            const initials = (row.fullName ?? "?")
              .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

            return (
              <Link
                key={row.id}
                href={`/dashboard/coach/messages/${row.id}`}
                className="ep-card animate-fade-up ep-msg-row"
                style={{
                  animationDelay: `${Math.min(i, 12) * 40}ms`,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  textDecoration: "none",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #E01E1E, #890404)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#F5EDED",
                  flexShrink: 0,
                  position: "relative",
                }}>
                  {initials}
                  {row.unread > 0 && (
                    <span style={{
                      position: "absolute",
                      top: -4, right: -4,
                      background: "#E01E1E",
                      border: "2px solid #0D0000",
                      borderRadius: "50%",
                      width: 16, height: 16,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 800, color: "#fff",
                    }}>
                      {row.unread > 9 ? "9+" : row.unread}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#F5EDED", display: "flex", alignItems: "center", gap: 6 }}>
                    {row.fullName ?? "Client"}
                    <RoleBadge label={row.badge} />
                  </p>
                  {row.lastContent ? (
                    <p style={{
                      margin: "2px 0 0",
                      fontSize: 11,
                      color: "rgba(245,237,237,0.35)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {row.lastContent}
                    </p>
                  ) : (
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.18)", fontStyle: "italic" }}>
                      Aucun message
                    </p>
                  )}
                </div>

                {/* Right */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  {row.lastTime && (
                    <span style={{ fontSize: 10, color: "rgba(245,237,237,0.22)" }}>
                      {row.lastTime}
                    </span>
                  )}
                  <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.2)" }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
