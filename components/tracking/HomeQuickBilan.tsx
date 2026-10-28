"use client";

import Link from "next/link";
import { ChevronRight, Check } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import QuickBilan, { type QuickBilanProps } from "@/components/tracking/QuickBilan";

// Saisie rapide sur l'accueil : les 3 infos qui comptent aujourd'hui pour
// cette personne (moteur de tracking), enregistrées d'un tap, sans ouvrir le
// bilan. Quand c'est déjà fait, une simple ligne de confirmation.

export default function HomeQuickBilan({
  doneAtLoad, summary, bilanHref = "/dashboard/client/bilan", ...props
}: QuickBilanProps & { doneAtLoad: boolean; summary: string; bilanHref?: string }) {
  const t = useT();
  if (doneAtLoad) {
    return (
      <Link href={bilanHref} className="ep-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", marginBottom: 16, textDecoration: "none" }}>
        <span style={{ width: 28, height: 28, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(var(--ep-ok-rgb),0.14)", flexShrink: 0 }}>
          <Check size={15} strokeWidth={3} style={{ color: "var(--ep-ok)" }} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "var(--ep-ink)" }}>{t("Bilan du jour fait")}</span>
          <span style={{ display: "block", fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span>
        </span>
        <ChevronRight size={15} style={{ color: "rgba(var(--ep-ink-rgb),0.3)" }} />
      </Link>
    );
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <QuickBilan {...props} />
      <p style={{ margin: "8px 2px 0", fontSize: 12 }}>
        <Link href={bilanHref} style={{ color: "rgba(var(--ep-ink-rgb),0.5)", fontWeight: 700 }}>{t("Voir le bilan complet")}</Link>
      </p>
    </div>
  );
}
