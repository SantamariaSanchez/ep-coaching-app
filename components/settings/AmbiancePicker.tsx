"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import {
  ACCENTS,
  MODES,
  applyAppearance,
  currentAppearance,
  serializeAppearance,
  DEFAULT_APPEARANCE,
  type Appearance,
} from "@/lib/theme-color";
import { setAppearanceAction } from "@/app/actions/user-settings";

// Choix de l'apparence en deux touches : le fond (sombre ou clair) puis la
// couleur. Changement immédiat, avec un aperçu miniature, et retenu sur le
// compte pour suivre la personne sur ses autres appareils.
export default function AmbiancePicker({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const [current, setCurrent] = useState<Appearance>(DEFAULT_APPEARANCE);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- l'apparence vit sur <html>, lisible seulement côté navigateur.
  useEffect(() => setCurrent(currentAppearance()), []);

  function pick(next: Appearance) {
    applyAppearance(next);
    setCurrent(next);
    void setAppearanceAction(serializeAppearance(next)).catch(() => {});
  }

  const accent = ACCENTS.find((a) => a.key === current.accent) ?? ACCENTS[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("Fond de l'appli")}>
        {MODES.map((m) => {
          const on = current.mode === m.key;
          const dark = m.key === "sombre";
          const bg = dark ? accent.bgDark : accent.bgLight;
          const card = dark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
          const ink = dark ? "rgba(245,237,237,0.85)" : "rgba(30,24,28,0.8)";
          const inkSoft = dark ? "rgba(245,237,237,0.22)" : "rgba(30,24,28,0.16)";
          const color = dark ? accent.dark : accent.light;
          return (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick({ ...current, mode: m.key })}
              className="text-left rounded-2xl p-1.5 transition-transform active:scale-[0.97]"
              style={{ border: `2px solid ${on ? "var(--ep-accent)" : "rgba(var(--ep-line-rgb),0.35)"}` }}
            >
              <div className="rounded-xl overflow-hidden" style={{ background: bg, aspectRatio: compact ? "16 / 9" : "4 / 3" }}>
                <div className="p-2 flex flex-col gap-1.5 h-full">
                  <div className="h-1.5 w-10 rounded-full" style={{ background: inkSoft }} />
                  <div className="h-2.5 w-16 rounded-full" style={{ background: ink }} />
                  <div className="rounded-lg p-1.5 flex flex-col gap-1" style={{ background: card, border: `1px solid ${inkSoft}` }}>
                    <div className="h-1.5 w-12 rounded-full" style={{ background: inkSoft }} />
                    <div className="h-1.5 w-9 rounded-full" style={{ background: inkSoft }} />
                  </div>
                  <div className="mt-auto h-4 rounded-md" style={{ background: color }} />
                </div>
              </div>
              <div className="px-1 pt-1.5 pb-0.5 flex items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-(--ep-strong)">
                  {dark ? <Moon size={12} /> : <Sun size={12} />} {t(m.label)}
                </span>
                {on && (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center bg-(--ep-accent)">
                    <Check size={10} color="#fff" strokeWidth={3} />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <p className="text-[11px] font-bold text-(--ep-ink)/50 mb-2">{t("Couleur")}</p>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={t("Couleur de l'appli")}>
          {ACCENTS.map((a) => {
            const on = current.accent === a.key;
            const color = current.mode === "sombre" ? a.dark : a.light;
            return (
              <button
                key={a.key}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={t(a.label)}
                title={t(a.label)}
                onClick={() => pick({ ...current, accent: a.key })}
                className="flex flex-col items-center gap-1 transition-transform active:scale-[0.94]"
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: color, boxShadow: on ? `0 0 0 2px var(--ep-bg), 0 0 0 4px ${color}` : "none" }}
                >
                  {on && <Check size={16} color="#fff" strokeWidth={3} />}
                </span>
                <span className={`text-[10.5px] ${on ? "font-bold text-(--ep-strong)" : "text-(--ep-ink)/50"}`}>{t(a.label)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
