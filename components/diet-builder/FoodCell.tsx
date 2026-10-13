"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import type { Food } from "@/utils/nutrition";
import { fuzzyMatchAny } from "@/lib/fuzzy-search";
import { checkFoodWatch, type FoodWatchContext } from "@/lib/food-watch-keywords";

// Cellule « Aliment » du tableur de diète : on tape, la base d'aliments
// propose (avec les alertes allergies / régime / aliments détestés), Entrée
// choisit et passe directement à la quantité.
export default function FoodCell({
  value,
  foods,
  watch,
  hideIncompatibleDiet,
  cellId,
  placeholder,
  onChange,
  onPick,
  onNavKey,
}: {
  value: string;
  foods: Food[];
  watch: FoodWatchContext | null;
  hideIncompatibleDiet: string | null;
  cellId: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onPick: (food: Food) => void;
  onNavKey: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const tr = useT();
  const ref = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; above: number; left: number; width: number; up: boolean } | null>(null);
  const q = value.trim();

  const matches = useMemo(() => {
    if (q.length < 2) return [] as Food[];
    const pool = hideIncompatibleDiet ? foods.filter((f) => !f.diet_tags || f.diet_tags.includes(hideIncompatibleDiet)) : foods;
    const lower = q.toLowerCase();
    const starts = pool.filter((f) => f.name.toLowerCase().startsWith(lower));
    const fuzzy = pool.filter((f) => !starts.includes(f) && fuzzyMatchAny([f.name, f.category ?? ""], q));
    return [...starts, ...fuzzy].slice(0, 8);
  }, [foods, q, hideIncompatibleDiet]);

  const exact = foods.some((f) => f.name.toLowerCase() === q.toLowerCase());
  const show = open && matches.length > 0 && !(exact && matches.length === 1);

  useLayoutEffect(() => {
    if (!show) return;
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: r.bottom + 4, above: window.innerHeight - r.top + 4, left: r.left, width: Math.max(r.width, 300), up: window.innerHeight - r.bottom < 280 && r.top > 280 });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [show]);

  function pick(f: Food) {
    onPick(f);
    setOpen(false);
  }

  return (
    <>
      <input
        ref={ref}
        value={value}
        data-dcell={cellId}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (show) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, matches.length - 1));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              const f = matches[active];
              if (f) {
                e.preventDefault();
                pick(f);
                return;
              }
            }
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
          }
          // Nom tapé en entier (« banane ») : la liste est masquée, Entrée le prend quand même.
          if (e.key === "Enter" && q) {
            const f = foods.find((x) => x.name.toLowerCase() === q.toLowerCase()) ?? matches[0];
            if (f) {
              e.preventDefault();
              pick(f);
              return;
            }
          }
          onNavKey(e);
        }}
        placeholder={placeholder}
        aria-label={tr("Aliment")}
        autoComplete="off"
        spellCheck={false}
        className="w-full bg-transparent px-2 py-2 text-[13px] font-semibold text-(--ep-strong) placeholder:text-(--ep-ink)/25 placeholder:font-normal focus:outline-none"
      />
      {show &&
        pos &&
        createPortal(
          <div
            role="listbox"
            className="fixed z-[80] bg-(--ep-s3) border border-(--ep-line)/50 rounded-lg shadow-2xl overflow-hidden"
            style={{ left: Math.min(pos.left, window.innerWidth - pos.width - 8), width: pos.width, ...(pos.up ? { bottom: pos.above } : { top: pos.top }) }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {matches.map((f, i) => {
              const hits = watch ? checkFoodWatch(f, watch) : [];
              return (
                <button
                  key={f.id}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(f)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 border-b border-(--ep-line)/10 last:border-0 ${i === active ? "bg-(--ep-line)/25" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-(--ep-strong) truncate">{f.name}</span>
                    {hits.length > 0 && (
                      <span className="flex items-center gap-1 text-[10.5px] text-amber-300 truncate">
                        <AlertTriangle size={10} className="flex-shrink-0" /> {hits.join(", ")}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-(--ep-ink)/40 flex-shrink-0 text-right">
                    {Math.round(f.calories_per_100)} kcal
                    <br />P {Math.round(f.proteins_per_100)} · G {Math.round(f.carbs_per_100)} · L {Math.round(f.fats_per_100)}
                  </span>
                </button>
              );
            })}
            <p className="px-3 py-1.5 text-[10px] text-(--ep-ink)/35 bg-(--ep-shade)/10">{tr("Valeurs pour 100 g · Entrée pour choisir")}</p>
          </div>,
          document.body
        )}
    </>
  );
}
