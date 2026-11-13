"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import { ListChecks, MessageCircleQuestion } from "lucide-react";
import type { SalesCall } from "@/lib/sales-calls";
import SalesCallsTable from "@/components/coach/SalesCallsTable";
import SalesCallScripts from "@/components/coach/SalesCallScripts";

// Deux natures de contenu bien distinctes (retour direct 2026-09-18) :
// "Suivi" reste le tableau existant (un appel = une ligne), "Questions
// de closing" est la nouvelle bibliothèque de contenu, jamais mélangés
// dans le même bloc.
type Tab = "suivi" | "closing";

export default function SalesCallTabs({ calls }: { calls: SalesCall[] }) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("suivi");

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(
          [
            { id: "suivi", label: t("Mes appels"), icon: ListChecks },
            { id: "closing", label: t("Closing"), icon: MessageCircleQuestion },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 999,
              fontSize: 11, fontWeight: 700,
              border: tab === id ? "1px solid var(--ep-accent)" : "1px solid rgba(var(--ep-ink-rgb),0.15)",
              background: tab === id ? "rgba(var(--ep-accent-rgb),0.16)" : "rgba(var(--ep-shade-rgb),0.25)",
              color: tab === id ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.55)",
              cursor: "pointer",
            }}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      <div hidden={tab !== "suivi"}>
        <SalesCallsTable calls={calls} />
      </div>
      <div hidden={tab !== "closing"}>
        <SalesCallScripts />
      </div>
    </div>
  );
}
