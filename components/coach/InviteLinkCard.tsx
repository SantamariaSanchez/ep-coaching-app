"use client";

import { useState } from "react";
import { Link2, Copy, Check } from "lucide-react";
import { ensureInviteCode } from "@/app/dashboard/coach/profile/actions";

export default function InviteLinkCard({ inviteCode }: { inviteCode: string | null }) {
  const [code, setCode] = useState(inviteCode);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://ep-coaching.vercel.app";
  const link = code ? `${origin}/auth/client?coach=${code}` : null;

  async function generate() {
    setLoading(true);
    const result = await ensureInviteCode();
    setLoading(false);
    if (result.code) setCode(result.code);
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-8">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
        Tes clients
      </p>
      <h2 className="text-xl font-black uppercase tracking-tight mb-4">Ton lien d&apos;invitation</h2>
      <div className="ep-card" style={{ padding: "16px 20px" }}>
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.45)", margin: "0 0 12px", lineHeight: 1.6 }}>
          Partage ce lien à tes clients pour qu&apos;ils s&apos;inscrivent et soient
          automatiquement rattachés à toi, jamais à un autre coach de la plateforme.
        </p>
        {link ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderRadius: 10, minWidth: 0,
              background: "rgba(0,0,0,0.3)", border: "1px solid rgba(224,30,30,0.15)",
            }}>
              <Link2 size={14} style={{ color: "#E01E1E", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#F5EDED", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {link}
              </span>
            </div>
            <button
              type="button"
              onClick={copy}
              style={{
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                height: 38, padding: "0 14px", borderRadius: 8, border: "none",
                background: copied ? "#4ade80" : "#E01E1E", color: copied ? "#0a1f0a" : "#fff",
                fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            style={{
              height: 40, padding: "0 18px", borderRadius: 8, border: "none",
              background: "#E01E1E", color: "#fff", fontWeight: 700, fontSize: 12,
              textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer",
            }}
          >
            {loading ? "Génération..." : "Générer mon lien"}
          </button>
        )}
      </div>
    </div>
  );
}
