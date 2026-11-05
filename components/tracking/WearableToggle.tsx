"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";

// « J'ai une bague ou une montre » : une seule case. Cochée, le bilan ne
// demande plus que la durée de sommeil et sa qualité (le détail est dans
// l'appli de la bague, inutile de le ressaisir).
export default function WearableToggle({ value, onSet }: { value: boolean; onSet: (has: boolean) => Promise<{ error?: string }> }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    start(async () => {
      const res = await onSet(!value);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="ep-card" style={{ padding: "12px 14px", opacity: pending ? 0.7 : 1 }}>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", minHeight: 44 }}>
        <input type="checkbox" checked={value} disabled={pending} onChange={toggle} style={{ marginTop: 3, width: 18, height: 18 }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          {t("J'ai une bague ou une montre connectée")}
          <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "rgba(var(--ep-ink-rgb),0.55)", marginTop: 2 }}>
            {t("Le bilan ne demande alors que la durée de sommeil et sa qualité.")}
          </span>
        </span>
      </label>
      {error && <p style={{ fontSize: 11, color: "var(--ep-pink)", margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
