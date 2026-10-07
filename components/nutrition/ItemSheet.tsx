"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useMemo, useState } from "react";
import { Minus, Plus, Repeat, Search, Trash2 } from "lucide-react";
import Sheet from "@/components/nutrition/Sheet";
import { equivalentGrams, macrosFor, normalize, roundGrams, searchFoods, similarFoods, type SearchContext } from "@/lib/nutrition-engine";
import type { Food } from "@/utils/nutrition";

// Modifier un aliment du jour : quantité, remplacement par un aliment
// similaire (quantité équivalente déjà calculée) ou suppression.
export default function ItemSheet({
  title,
  food,
  grams,
  planGrams,
  foods,
  ctx,
  allowSwap,
  hint,
  busy,
  onSave,
  onRemove,
  onClose,
}: {
  title: string;
  food: Food;
  grams: number;
  planGrams?: number | null;
  foods: Food[];
  ctx: SearchContext;
  allowSwap: boolean;
  hint?: string;
  busy?: boolean;
  onSave: (next: { food: Food; grams: number }) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [current, setCurrent] = useState<Food>(food);
  const [qty, setQty] = useState(String(grams));
  const [query, setQuery] = useState("");
  const g = Math.max(0, Number(qty.replace(",", ".")) || 0);
  const m = macrosFor(current, g);
  const step = g < 20 ? 1 : 5;

  const boost = useMemo(() => new Set([...ctx.planIds, ...ctx.recentIds]), [ctx]);
  const similar = useMemo(() => (allowSwap ? similarFoods(food, grams, foods, 8, boost) : []), [allowSwap, food, grams, foods, boost]);
  const searched = useMemo(() => {
    if (!allowSwap || normalize(query).length < 2) return [];
    return searchFoods(foods, query, ctx, "tout", 12)
      .filter((f) => f.id !== food.id)
      .map((f) => ({ food: f, grams: equivalentGrams(food, grams, f) }));
  }, [allowSwap, query, foods, ctx, food, grams]);

  const changed = current.id !== food.id || g !== grams;

  function pick(f: Food, eq: number) {
    setCurrent(f);
    setQty(String(eq));
  }

  return (
    <Sheet
      title={current.name}
      subtitle={title}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-[#890404]/40 text-[#F5EDED]/70 text-xs font-bold uppercase tracking-widest disabled:opacity-40"
          >
            <Trash2 size={14} />{" "}{t("Retirer")}
          </button>
          <button
            type="button"
            onClick={() => onSave({ food: current, grams: roundGrams(g) || g })}
            disabled={busy || !changed || g <= 0}
            className="flex-1 px-4 py-3 rounded-xl bg-[#E01E1E] text-white text-xs font-black uppercase tracking-widest disabled:opacity-40"
          >
            {busy ? "..." : t("Enregistrer")}
          </button>
        </div>
      }
    >
      <div className="rounded-xl border border-[#890404]/25 bg-black/30 p-3 mb-4">
        <div className="flex items-center gap-2">
          <button type="button" aria-label={t("Moins")} onClick={() => setQty(String(Math.max(step, roundGrams(g - step))))} className="w-11 h-11 rounded-xl border border-[#890404]/35 text-white flex items-center justify-center">
            <Minus size={16} />
          </button>
          <div className="flex-1 relative">
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="decimal"
              aria-label={t("Quantité en grammes")}
              className="w-full h-11 text-center text-xl font-black bg-transparent border border-[#890404]/35 rounded-xl text-white focus:outline-none focus:border-[#E01E1E]/60"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#F5EDED]/40">g</span>
          </div>
          <button type="button" aria-label={t("Plus")} onClick={() => setQty(String(roundGrams(g + step)))} className="w-11 h-11 rounded-xl border border-[#890404]/35 text-white flex items-center justify-center">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {[
            ...(planGrams && current.id === food.id ? [{ label: `Plan ${planGrams} g`, v: planGrams }] : []),
            { label: "½", v: roundGrams(g / 2) },
            { label: "×1,5", v: roundGrams(g * 1.5) },
            { label: "×2", v: roundGrams(g * 2) },
          ].map((c) => (
            <button key={c.label} type="button" onClick={() => setQty(String(c.v))} className="px-2.5 py-1 rounded-full border border-[#890404]/30 text-[11px] font-bold text-[#F5EDED]/65">
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#F5EDED]/55 mt-2.5">
          <b className="text-white">{Math.round(m.calories)}{" "}{t("kcal")}</b> · P {Math.round(m.proteins)} g · G {Math.round(m.carbs)} g · L {Math.round(m.fats)} g
        </p>
        {hint && <p className="text-[11px] text-emerald-300/80 mt-1.5">{hint}</p>}
      </div>

      {allowSwap && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-2 flex items-center gap-1.5">
            <Repeat size={11} />{" "}{t("Remplacer par")}
          </p>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Chercher un autre aliment")}
              aria-label={t("Chercher un aliment de remplacement")}
              className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60"
            />
          </div>
          <div className="space-y-1">
            {(searched.length > 0 ? searched : similar).map((s) => {
              const sm = macrosFor(s.food, s.grams);
              const active = current.id === s.food.id;
              return (
                <button
                  key={s.food.id}
                  type="button"
                  onClick={() => pick(s.food, s.grams)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${active ? "border-[#E01E1E]/60 bg-[#E01E1E]/10" : "border-transparent hover:bg-[#1f0101]"}`}
                >
                  <p className="text-sm text-white font-medium leading-tight">
                    {s.food.name} <span className="text-[#F5EDED]/50 font-normal">· {s.grams} g</span>
                  </p>
                  <p className="text-[10.5px] text-[#F5EDED]/40 mt-0.5">
                    {Math.round(sm.calories)}{" "}{t("kcal · P")}{" "}{Math.round(sm.proteins)} · G {Math.round(sm.carbs)} · L {Math.round(sm.fats)}
                  </p>
                </button>
              );
            })}
            {searched.length === 0 && similar.length === 0 && <p className="text-xs text-[#F5EDED]/40 py-2">{t("Aucun aliment proche trouvé, cherche-le au-dessus.")}</p>}
          </div>
          {current.id !== food.id && (
            <button type="button" onClick={() => pick(food, grams)} className="mt-2 text-[11px] font-bold text-[#F5EDED]/50 underline">
              {t("Revenir à")}{" "}{food.name}
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}
