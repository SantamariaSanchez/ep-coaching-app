"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Trophy, EyeOff } from "lucide-react";
import { setLeaderboardVisible } from "@/app/actions/privacy";

// Rubrique Confidentialité côté membre, pendant de PrivacyCard (coach) :
// le classement communautaire affichait d'office nom, photo et points de
// chaque membre actif, tous coachs confondus, sans moyen de s'en retirer.
// Même pattern optimiste + rollback que PrivacyCard.
export default function MemberPrivacyCard({ initialVisible }: { initialVisible: boolean }) {
  const t = useT();
  const [visible, setVisible] = useState(initialVisible);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !visible;
    const previous = visible;
    setVisible(next);
    setError(null);
    startTransition(async () => {
      const result = await setLeaderboardVisible(next);
      if (result.error) {
        setVisible(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="mt-8">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
        {t("Confidentialité")}
      </p>
      <h2 className="text-xl font-black uppercase tracking-tight mb-4">{t("Visibilité")}</h2>
      <div className="ep-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {visible ? (
            <Trophy size={18} style={{ color: "#4ade80", flexShrink: 0 }} />
          ) : (
            <EyeOff size={18} style={{ color: "#E01E1E", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#F5EDED" }}>
              {visible ? "Visible dans le classement communautaire" : "Masqué du classement communautaire"}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
              {visible
                ? "Les autres membres voient ton nom, ta photo et tes points dans le classement."
                : "Les autres membres ne te voient plus dans le classement. Toi, tu gardes ta position et tu continues de gagner des points."}
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            disabled={isPending}
            role="switch"
            aria-checked={visible}
            aria-label={t("Visibilité dans le classement communautaire")}
            style={{
              flexShrink: 0, width: 40, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
              background: visible ? "#4ade80" : "rgba(245,237,237,0.15)", position: "relative", transition: "background 0.15s ease",
            }}
          >
            <span style={{
              position: "absolute", top: 3, left: visible ? 19 : 3, width: 18, height: 18, borderRadius: "50%",
              background: "#0d0000", transition: "left 0.15s ease",
            }} />
          </button>
        </div>
        {error && (
          <p role="alert" style={{ margin: "10px 0 0", fontSize: 11, color: "#E01E1E" }}>{error}</p>
        )}
        <p style={{ margin: "12px 0 0", fontSize: 11, color: "rgba(245,237,237,0.35)", lineHeight: 1.5 }}>
          {t("Ce réglage concerne uniquement le classement. Tes publications dans la communauté restent signées de ton nom, et si tu es accompagné, ton coach voit toujours ton suivi.")}{" "}
          <Link href="/dashboard/client/communaute/classement" style={{ color: "#E01E1E", fontWeight: 700 }}>
            {t("Voir le classement")}
          </Link>
        </p>
      </div>
    </div>
  );
}
