"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RotateCw } from "lucide-react";

// Erreur de lecture de la road map côté serveur (utils/phase-pilot.ts,
// loadRoadmapPageData). Audit 2026-09-28 : une panne base ne doit JAMAIS
// s'afficher comme "pas encore de road map" (message "ton coach n'a pas
// configuré", formulaire de création vide...), sinon on pousse à recréer
// par-dessus la vraie. On le dit clairement et on propose de réessayer.
export default function RoadmapLoadError({ message, hint }: { message: string; hint?: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="alert"
      className="ep-card"
      style={{ padding: "16px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
    >
      <AlertCircle size={18} style={{ color: "#E01E1E", flexShrink: 0 }} />
      <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.65)", lineHeight: 1.5, margin: 0, flex: "1 1 200px" }}>
        {message}
        {hint ? ` ${hint}` : ""}
      </p>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className="ep-btn-secondary"
        style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
      >
        <RotateCw size={13} /> {pending ? t("Chargement…") : t("Réessayer")}
      </button>
    </div>
  );
}
