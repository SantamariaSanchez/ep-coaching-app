"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

// Bilan déjà fait à l'ouverture de la page : replié derrière « Modifier ».
// L'état est figé au chargement : un enregistrement en cours de saisie ne
// referme plus le formulaire (avant, le premier poids enregistré repliait
// tout le bilan comme s'il était terminé).
export default function BilanCollapse({ doneAtLoad, children }: { doneAtLoad: boolean; children: React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(!doneAtLoad);
  if (open) return <>{children}</>;
  return (
    <button
      type="button" onClick={() => setOpen(true)} className="ep-card"
      style={{ width: "100%", cursor: "pointer", padding: "13px 14px", display: "flex", alignItems: "center", gap: 10, textAlign: "left", border: "none" }}
    >
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800, color: "var(--ep-ink)" }}>{t("Bilan du jour rempli")}</span>
      <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--ep-accent-hi2)" }}>{t("Modifier")}</span>
    </button>
  );
}
