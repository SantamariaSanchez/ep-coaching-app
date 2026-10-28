"use client";

import { useEffect, useState } from "react";
import { X, Lightbulb } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";

// Un seul conseil à la fois, une phrase, facile à fermer : jamais intrusif.
// La fermeture est retenue pour la semaine (confort, sans importance si le
// stockage du navigateur est indisponible).
export default function ClientNudgeCard({ id, text, weekKey }: { id: string; text: string; weekKey: string }) {
  const t = useT();
  const storageKey = `ep-nudge-${id}-${weekKey}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(storageKey) === "1";
    } catch {
      dismissed = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(dismissed);
  }, [storageKey]);

  if (hidden) return null;

  return (
    <div className="mx-4 mt-4 ep-page-medium flex items-start gap-2.5 rounded-xl border border-(--ep-line)/25 bg-(--ep-s1) p-3">
      <Lightbulb size={14} className="mt-0.5 shrink-0 text-(--ep-accent)" />
      <p className="flex-1 text-xs leading-relaxed text-(--ep-ink)/75">{t(text)}</p>
      <button
        type="button"
        aria-label={t("Ignorer")}
        onClick={() => {
          setHidden(true);
          try {
            window.localStorage.setItem(storageKey, "1");
          } catch {
            // rien de grave
          }
        }}
        className="p-1 text-(--ep-ink)/30 hover:text-(--ep-ink)/60"
      >
        <X size={13} />
      </button>
    </div>
  );
}
