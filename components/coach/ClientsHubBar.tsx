"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Check, Mail, MessageCircle, UserPlus } from "lucide-react";
import { ensureInviteCode } from "@/app/dashboard/coach/profile/actions";
import { inviteLinkFor, inviteMessage } from "@/components/coach/InviteFirstClientCard";

// Barre d'actions de l'onglet Clients (audit 2026-11-13) : inviter en un tap,
// et les anciens sous-onglets (Messages, Mailing, Assistant) en icônes.
const icon: React.CSSProperties = {
  position: "relative", width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center",
  borderRadius: 12, background: "rgba(var(--ep-ink-rgb),0.04)", border: "1px solid rgba(var(--ep-line-rgb),0.25)",
  color: "var(--ep-ink)", flexShrink: 0,
};

export default function ClientsHubBar({ inviteCode, coachFirstName, unread }: { inviteCode: string | null; coachFirstName: string | null; unread: number }) {
  const [code, setCode] = useState(inviteCode);
  const [done, setDone] = useState(false);

  async function invite() {
    let c = code;
    if (!c) {
      const res = await ensureInviteCode().catch(() => ({ code: null as string | null }));
      c = res.code ?? null;
      setCode(c);
    }
    if (!c) return;
    const text = inviteMessage(inviteLinkFor(c), coachFirstName);
    if (typeof navigator.share === "function") {
      try { await navigator.share({ text }); return; } catch { return; }
    }
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch { /* copie refusée */ }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <button
        type="button"
        onClick={invite}
        className="ep-press"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, height: 44, padding: "0 14px", borderRadius: 12,
          border: "none", background: "var(--ep-accent)", color: "var(--ep-strong)", fontSize: 13, fontWeight: 800, cursor: "pointer",
        }}
      >
        {done ? <Check size={15} /> : <UserPlus size={15} />}
        {done ? "Copié" : "Inviter"}
      </button>
      <span style={{ flex: 1 }} />
      <Link href="/dashboard/coach/messages" aria-label="Messages" className="ep-press" style={icon}>
        <MessageCircle size={18} />
        {unread > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "var(--ep-accent)", color: "var(--ep-strong)", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
      <Link href="/dashboard/coach/mailing" aria-label="Mailing" className="ep-press" style={icon}><Mail size={18} /></Link>
      <Link href="/dashboard/coach/assistant" aria-label="Assistant" className="ep-press" style={icon}><Bot size={18} /></Link>
    </div>
  );
}
