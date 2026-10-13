"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { AMBIANCES, applyAmbiance, currentAmbiance, type Ambiance } from "@/lib/theme-color";

// Choix de l'ambiance en un tap, avec un aperçu miniature de chaque écran :
// on voit ce qu'on choisit avant de le choisir. Changement immédiat, retenu
// sur l'appareil.
export default function AmbiancePicker({ compact = false, onPicked }: { compact?: boolean; onPicked?: (a: Ambiance) => void }) {
  const t = useT();
  const [current, setCurrent] = useState<Ambiance>("sombre");
  useEffect(() => setCurrent(currentAmbiance()), []);

  return (
    <div className={`grid grid-cols-3 ${compact ? "gap-2" : "gap-2.5"}`} role="radiogroup" aria-label={t("Ambiance de l'appli")}>
      {AMBIANCES.map((a) => {
        const [bg, card, accent] = a.swatch;
        const on = current === a.key;
        const ink = a.key === "sombre" ? "rgba(245,237,237,0.85)" : "rgba(42,27,31,0.8)";
        const inkSoft = a.key === "sombre" ? "rgba(245,237,237,0.25)" : "rgba(42,27,31,0.18)";
        return (
          <button
            key={a.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              applyAmbiance(a.key);
              setCurrent(a.key);
              onPicked?.(a.key);
            }}
            className="text-left rounded-2xl p-1.5 transition-transform active:scale-[0.97]"
            style={{ border: `2px solid ${on ? accent : "rgba(var(--ep-line-rgb),0.35)"}` }}
          >
            {/* Mini-écran */}
            <div className="rounded-xl overflow-hidden" style={{ background: bg, aspectRatio: compact ? "4 / 3" : "3 / 4" }}>
              <div className="p-2 flex flex-col gap-1.5 h-full">
                <div className="h-1.5 w-10 rounded-full" style={{ background: inkSoft }} />
                <div className="h-2.5 w-16 rounded-full" style={{ background: ink }} />
                <div className="rounded-lg p-1.5 flex flex-col gap-1" style={{ background: card, border: `1px solid ${inkSoft}` }}>
                  <div className="h-1.5 w-12 rounded-full" style={{ background: inkSoft }} />
                  <div className="h-1.5 w-9 rounded-full" style={{ background: inkSoft }} />
                </div>
                <div className="mt-auto h-4 rounded-md" style={{ background: accent }} />
              </div>
            </div>
            <div className="px-1 pt-1.5 pb-0.5 flex items-center justify-between gap-1">
              <span className="text-[12.5px] font-bold text-(--ep-strong)">{t(a.label)}</span>
              {on && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: accent }}>
                  <Check size={10} color="#fff" strokeWidth={3} />
                </span>
              )}
            </div>
            {!compact && <p className="px-1 text-[10.5px] leading-snug text-(--ep-ink)/50">{t(a.hint)}</p>}
          </button>
        );
      })}
    </div>
  );
}
