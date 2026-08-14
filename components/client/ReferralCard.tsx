"use client";

import { useState } from "react";
import { Link2, Copy, Check, Gift } from "lucide-react";
import { ensureReferralCode } from "@/app/dashboard/client/profile/actions";

// Item 41 : même patron visuel que InviteLinkCard (coach → clients), pour
// un membre/client qui parraine un ami. Code + colonne dédiés (referral_code
// / referred_by), aucun effet sur l'attribution de coach — voir la
// migration 20260814_referral_program.sql.
export default function ReferralCard({
  referralCode,
  referredCount,
  pointsPerReferral,
}: {
  referralCode: string | null;
  referredCount: number;
  pointsPerReferral: number;
}) {
  const [code, setCode] = useState(referralCode);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://ep-coaching.vercel.app";
  const link = code ? `${origin}/auth/client?ref=${code}` : null;

  async function generate() {
    setLoading(true);
    const result = await ensureReferralCode();
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
        Parrainage
      </p>
      <h2 className="text-xl font-black uppercase tracking-tight mb-4">Invite un ami</h2>
      <div className="ep-card" style={{ padding: "16px 20px" }}>
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.45)", margin: "0 0 12px", lineHeight: 1.6 }}>
          Partage ton lien personnel. Dès qu&apos;un ami s&apos;inscrit avec, tu gagnes{" "}
          {pointsPerReferral} points.
        </p>
        {link ? (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: referredCount > 0 ? 12 : 0 }}>
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
            {referredCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Gift size={13} style={{ color: "#FACC15", flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)", fontWeight: 600 }}>
                  {referredCount} ami{referredCount > 1 ? "s" : ""} déjà parrainé{referredCount > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </>
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
