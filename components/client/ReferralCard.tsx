"use client";

import { useT } from "@/components/i18n/I18nProvider";
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
  rewardedCount,
  pointsPerReferral,
}: {
  referralCode: string | null;
  referredCount: number;
  rewardedCount: number;
  pointsPerReferral: number;
}) {
  const t = useT();
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
      <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">
        {t("Parrainage")}
      </p>
      <h2 className="text-xl font-black uppercase tracking-tight mb-4">{t("Invite un ami")}</h2>
      <div className="ep-card" style={{ padding: "16px 20px" }}>
        <p style={{ fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.45)", margin: "0 0 12px", lineHeight: 1.6 }}>
          {t("Partage ton lien personnel. Dès qu'un ami s'inscrit avec, tu gagnes")}{" "}
          {pointsPerReferral}{" "}{t("points. Et le jour où il devient client payant, tu reçois un mois offert sur ton abonnement.")}
        </p>
        {link ? (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: referredCount > 0 ? 12 : 0 }}>
              <div style={{
                flex: 1, display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 10, minWidth: 0,
                background: "rgba(var(--ep-shade-rgb),0.3)", border: "1px solid rgba(var(--ep-accent-rgb),0.15)",
              }}>
                <Link2 size={14} style={{ color: "var(--ep-accent)", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--ep-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {link}
                </span>
              </div>
              <button
                type="button"
                onClick={copy}
                style={{
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                  height: 38, padding: "0 14px", borderRadius: 8, border: "none",
                  background: copied ? "var(--ep-ok)" : "var(--ep-accent)", color: copied ? "var(--ep-okbg)" : "#fff",
                  fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t("Copié") : t("Copier")}
              </button>
            </div>
            {referredCount > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Gift size={13} style={{ color: "var(--ep-yellow)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.5)", fontWeight: 600 }}>
                    {referredCount}{" "}{t("ami")}{referredCount > 1 ? "s" : ""}{" "}{t("déjà parrainé")}{referredCount > 1 ? "s" : ""}
                  </span>
                </div>
                {rewardedCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Gift size={13} style={{ color: "var(--ep-ok)", flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: "var(--ep-ok)", fontWeight: 700 }}>
                      {rewardedCount}{" "}{t("mois offert")}{rewardedCount > 1 ? "s" : ""}{" "}{t("déjà gagné")}{rewardedCount > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
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
              background: "var(--ep-accent)", color: "#fff", fontWeight: 700, fontSize: 12,
              textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer",
            }}
          >
            {loading ? t("Génération...") : t("Générer mon lien")}
          </button>
        )}
      </div>
    </div>
  );
}
