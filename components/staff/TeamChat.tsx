"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Hash, Crown } from "lucide-react";
import type { TeamMessage, TeamPerson } from "@/lib/staff-team";
import { sendTeamMessageAction } from "@/app/equipe/team-actions";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function stamp(iso: string) {
  const d = new Date(iso);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const day = d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const time = d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
  return day === today ? time : `${d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" })} ${time}`;
}

export default function TeamChat({
  meId,
  people,
  unread,
  active,
  messages,
  basePath,
  compact = false,
}: {
  meId: string;
  people: TeamPerson[];
  unread: Record<string, number>;
  active: string | null;
  messages: TeamMessage[];
  /** Préfixe des liens de conversation, ex : "/equipe/messages?avec=". */
  basePath: string;
  /** Fil seul, sans l'annuaire (fiche d'un membre côté fondateur). */
  compact?: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const nameById = Object.fromEntries(people.map((p) => [p.id, p.name]));
  const others = people.filter((p) => p.id !== meId);
  const activePerson = others.find((p) => p.id === active);

  // Nouveaux messages sans recharger la page : rafraîchissement léger
  // toutes les 15 secondes tant que la conversation est ouverte.
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [active, router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send() {
    if (!active || !text.trim()) return;
    setError(null);
    const body = text;
    startTransition(async () => {
      const r = await sendTeamMessageAction(active, body);
      if ("error" in r) setError(r.error);
      else {
        setText("");
        router.refresh();
      }
    });
  }

  const thread = (
    <div className="ep-card" style={{ display: "flex", flexDirection: "column", minHeight: compact ? 320 : 520, maxHeight: compact ? 480 : "70vh" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(245,237,237,0.06)" }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", margin: 0 }}>
          {active === "general" ? "Canal équipe" : activePerson?.name ?? "Choisis une conversation"}
        </p>
        <p style={{ fontSize: 11, color: "rgba(245,237,237,0.4)", margin: 0 }}>
          {active === "general" ? "Visible par toute l'équipe et le fondateur" : activePerson?.subtitle ?? ""}
        </p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {!active ? (
          <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)", margin: "auto", textAlign: "center" }}>Sélectionne une personne ou le canal équipe.</p>
        ) : messages.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)", margin: "auto", textAlign: "center" }}>Aucun message pour l&apos;instant. Lance la conversation.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%" }}>
                {!mine && active === "general" && (
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(245,237,237,0.45)", margin: "0 0 2px 4px" }}>{nameById[m.sender_id] ?? "Ancien membre"}</p>
                )}
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 14,
                    background: mine ? "linear-gradient(135deg, #B00202, #E01E1E)" : "rgba(245,237,237,0.06)",
                    border: mine ? "none" : "1px solid rgba(245,237,237,0.08)",
                    color: "#F5EDED",
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.body}
                </div>
                <p style={{ fontSize: 10, color: "rgba(245,237,237,0.3)", margin: "2px 6px 0", textAlign: mine ? "right" : "left" }}>{stamp(m.created_at)}</p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      {active && (
        <div style={{ padding: 10, borderTop: "1px solid rgba(245,237,237,0.06)" }}>
          {error && <p role="alert" style={{ fontSize: 12, color: "#FDC4C4", margin: "0 0 6px" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder="Écris ton message (Entrée pour envoyer)"
              aria-label="Message"
              className="ep-input"
              style={{ flex: 1, resize: "none" }}
            />
            <button type="button" onClick={send} disabled={pending || !text.trim()} aria-label="Envoyer" className="ep-btn-primary" style={{ height: 44, width: 44, padding: 0, flexShrink: 0 }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (compact) return thread;

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(220px,280px)_1fr]">
      <div className="ep-card" style={{ padding: 8, alignSelf: "start" }}>
        <Link
          href={`${basePath}general`}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, textDecoration: "none", background: active === "general" ? "rgba(224,30,30,0.14)" : "transparent" }}
        >
          <span style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(224,30,30,0.12)", color: "#E01E1E", flexShrink: 0 }}>
            <Hash size={15} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>Canal équipe</span>
        </Link>
        <p className="ep-label" style={{ margin: "10px 10px 4px" }}>Membres ({others.length})</p>
        {others.length === 0 && <p style={{ fontSize: 12, color: "rgba(245,237,237,0.4)", margin: "4px 10px 8px" }}>Personne d&apos;autre dans l&apos;équipe pour l&apos;instant.</p>}
        {others.map((p) => (
          <Link
            key={p.id}
            href={`${basePath}${p.id}`}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, textDecoration: "none", background: active === p.id ? "rgba(224,30,30,0.14)" : "transparent" }}
          >
            <span style={{ width: 32, height: 32, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: `${p.poleColor}22`, color: p.poleColor, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
              {p.isFounder ? <Crown size={14} /> : initials(p.name)}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#F5EDED", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <span style={{ display: "block", fontSize: 11, color: "rgba(245,237,237,0.45)" }}>{p.subtitle}</span>
            </span>
            {unread[p.id] ? (
              <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: "#E01E1E", color: "#fff", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>{unread[p.id]}</span>
            ) : null}
          </Link>
        ))}
      </div>
      {thread}
    </div>
  );
}
