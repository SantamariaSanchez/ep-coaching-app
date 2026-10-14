"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, Copy, PackagePlus, RotateCcw, Share2 } from "lucide-react";
import { aggregatePlan, fmtGrams, RAYONS, rawEquivalent, rayonOf, roundUpForShopping, simpleEquivalent, type ShoppingLine } from "@/lib/diet-day";
import { guessPieceWeight, suggestUnit, toGrams, type PantryItem, type PantryUnit } from "@/lib/pantry";
import type { VariantChoice } from "@/lib/nutrition-engine";
import type { DietPlanWithMeals } from "@/utils/nutrition";
import type { NeedItem } from "@/lib/pantry";

// Liste de courses générée depuis le plan (2026-10-14) : agrégée jour par jour
// sur la période choisie, groupée par rayon, cases cochées gardées sur
// l'appareil, stock déduit (« à racheter »), partage ou copie en un tap.

const PERIODS = [1, 3, 7, 14] as const;
const STORE_KEY = "ep-courses-v1";

interface Stored {
  planKey: string;
  days: number;
  checked: string[];
  deduct: boolean;
}

function readStored(planKey: string): Stored {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Stored;
      if (s.planKey === planKey) return { ...s, checked: Array.isArray(s.checked) ? s.checked : [] };
    }
  } catch {
    // Stockage indisponible.
  }
  return { planKey, days: 7, checked: [], deduct: true };
}

function writeStored(s: Stored) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    // Stockage indisponible : la liste marche quand même.
  }
}

const noopSubscribe = () => () => {};

interface Row extends ShoppingLine {
  have: number;
  buy: number;
}

export default function ShoppingList({
  plan,
  today,
  pantry,
  fallbackNeeds,
  onStock,
  pending,
}: {
  plan: DietPlanWithMeals | null;
  today: string;
  /** Stock du placard (null tant qu'il charge). */
  pantry: PantryItem[] | null;
  /** Sans plan : besoins d'après les habitudes (7 jours). */
  fallbackNeeds: NeedItem[];
  onStock: (items: { foodId: string | null; name: string; category: string; unit: PantryUnit; quantity: number; gramsPerUnit: number | null }[]) => void;
  pending: boolean;
}) {
  const t = useT();
  const planKey = plan?.id ?? "habitudes";
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [state, setState] = useState<Stored | null>(null);
  const stored = state ?? (mounted ? readStored(planKey) : { planKey, days: 7, checked: [], deduct: true });
  const [copied, setCopied] = useState(false);
  const [showHave, setShowHave] = useState(false);

  function update(patch: Partial<Stored>) {
    const next = { ...stored, ...patch, planKey };
    setState(next);
    writeStored(next);
  }

  const lines: ShoppingLine[] = useMemo(() => {
    if (plan && plan.diet_plan_meals.length > 0) {
      const choiceFor = (d: string): VariantChoice => {
        try {
          const raw = localStorage.getItem(`ep-variants:${plan.id}:${d}`);
          return raw ? (JSON.parse(raw) as VariantChoice) : {};
        } catch {
          return {};
        }
      };
      return aggregatePlan(plan, today, stored.days, mounted ? choiceFor : () => ({}));
    }
    // Sans plan : habitudes de la semaine ramenées à la période.
    return fallbackNeeds.map((n) => {
      const food = { id: n.foodId, name: n.name, category: n.category, calories_per_100: 0, proteins_per_100: 0, carbs_per_100: 0, fats_per_100: 0 };
      return { foodId: n.foodId, food, grams: (n.totalGrams * stored.days) / 7, rayon: rayonOf(food), days: stored.days };
    });
  }, [plan, today, stored.days, fallbackNeeds, mounted]);

  const stockByFood = useMemo(() => new Map((pantry ?? []).filter((p) => p.food_id).map((p) => [p.food_id as string, p])), [pantry]);
  const canDeduct = (pantry?.length ?? 0) > 0;
  const deduct = canDeduct && stored.deduct;

  const rows: Row[] = useMemo(
    () =>
      lines.map((l) => {
        const item = stockByFood.get(l.foodId);
        const have = deduct && item ? toGrams(item) : 0;
        return { ...l, have, buy: roundUpForShopping(Math.max(0, l.grams - have)) };
      }),
    [lines, stockByFood, deduct]
  );
  const toBuy = useMemo(() => rows.filter((r) => r.buy > 0), [rows]);
  const covered = useMemo(() => rows.filter((r) => r.buy <= 0), [rows]);
  const checked = new Set(stored.checked);
  const checkedCount = toBuy.filter((r) => checked.has(r.foodId)).length;

  const byRayon = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of toBuy) map.set(r.rayon, [...(map.get(r.rayon) ?? []), r]);
    return RAYONS.filter((r) => map.has(r)).map((r) => [r, map.get(r)!] as const);
  }, [toBuy]);

  function toggle(foodId: string) {
    const next = new Set(stored.checked);
    if (next.has(foodId)) next.delete(foodId);
    else next.add(foodId);
    update({ checked: [...next] });
  }

  function label(r: Row): string {
    const eq = rawEquivalent(r.food, r.buy) ?? simpleEquivalent(r.food, r.buy);
    return `${fmtGrams(r.buy)}${eq ? ` (${eq})` : ""}`;
  }

  function asText(): string {
    const head = `${t("Courses")} EP Coaching, ${stored.days} ${stored.days > 1 ? t("jours") : t("jour")}`;
    const parts = byRayon.map(([rayon, list]) => `\n${rayon}\n${list.map((r) => `${checked.has(r.foodId) ? "[x]" : "[ ]"} ${r.food.name} : ${label(r)}`).join("\n")}`);
    return `${head}\n${parts.join("\n")}`;
  }

  async function share() {
    const text = asText();
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: t("Ma liste de courses"), text });
        return;
      }
    } catch {
      // Partage annulé ou indisponible : on copie.
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers refusé.
    }
  }

  function stockChecked() {
    const items = toBuy
      .filter((r) => checked.has(r.foodId))
      .map((r) => {
        const unit = suggestUnit(r.food.name, r.food.category);
        const gpu = unit === "piece" ? guessPieceWeight(r.food.name) : null;
        const quantity = unit === "piece" ? Math.max(1, Math.ceil(r.buy / (gpu ?? 100))) : r.buy;
        return { foodId: r.foodId, name: r.food.name, category: r.food.category ?? "Divers", unit, quantity, gramsPerUnit: gpu };
      });
    if (items.length === 0) return;
    onStock(items);
    update({ checked: [] });
  }

  return (
    <div className="space-y-3">
      {/* Période */}
      <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-2xl p-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45 mb-2 px-1">{t("Courses pour")}</p>
        <div className="grid grid-cols-4 gap-1 bg-(--ep-s2) rounded-xl p-1" role="radiogroup" aria-label={t("Nombre de jours")}>
          {PERIODS.map((d) => (
            <button
              key={d}
              role="radio"
              aria-checked={stored.days === d}
              onClick={() => update({ days: d })}
              className={`min-h-[44px] rounded-lg text-xs font-bold ${stored.days === d ? "bg-(--ep-accent) text-(--ep-strong)" : "text-(--ep-ink)/60"}`}
            >
              {d === 1 ? t("1 jour") : `${d} ${t("jours")}`}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-(--ep-ink)/50 mt-2 px-1 leading-snug">
          {plan ? t("Calculé jour par jour depuis ton plan, à partir d'aujourd'hui.") : t("Pas de plan : d'après ce que tu manges le plus.")}
          {canDeduct && (
            <>
              {" "}
              <button onClick={() => update({ deduct: !stored.deduct })} className="underline underline-offset-2 font-bold text-(--ep-ink)/70">
                {stored.deduct ? t("Stock déduit") : t("Stock non déduit")}
              </button>
            </>
          )}
        </p>
      </div>

      {toBuy.length === 0 ? (
        <div className="bg-(--ep-s1) border border-dashed border-(--ep-line)/25 rounded-2xl py-8 px-4 text-center">
          <Check size={22} className="mx-auto text-(--ep-ok) mb-2" />
          <p className="text-sm text-(--ep-ink)/60">
            {rows.length === 0 ? t("Rien à acheter pour l'instant. Demande un plan à ton coach ou note tes repas quelques jours.") : t("Tout est déjà chez toi pour cette période.")}
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <button onClick={share} className="flex-1 min-h-[44px] rounded-xl bg-(--ep-accent) text-(--ep-strong) text-sm font-bold inline-flex items-center justify-center gap-2">
              {copied ? <Check size={16} /> : typeof navigator !== "undefined" && mounted && typeof navigator.share === "function" ? <Share2 size={16} /> : <Copy size={16} />}
              {copied ? t("Liste copiée") : t("Partager la liste")}
            </button>
            {checkedCount > 0 && (
              <button onClick={() => update({ checked: [] })} aria-label={t("Tout décocher")} className="w-11 min-h-[44px] rounded-xl border border-(--ep-line)/30 flex items-center justify-center text-(--ep-ink)/60">
                <RotateCcw size={16} />
              </button>
            )}
          </div>

          {byRayon.map(([rayon, list]) => (
            <section key={rayon} className="bg-(--ep-s1) border border-(--ep-line)/20 rounded-2xl overflow-hidden">
              <p className="px-4 pt-3 pb-1 text-[11px] font-black uppercase tracking-widest text-(--ep-ink)/50">{rayon}</p>
              <ul>
                {list.map((r) => {
                  const done = checked.has(r.foodId);
                  const eq = rawEquivalent(r.food, r.buy) ?? simpleEquivalent(r.food, r.buy);
                  return (
                    <li key={r.foodId}>
                      <button onClick={() => toggle(r.foodId)} aria-pressed={done} className="w-full flex items-center gap-3 px-4 min-h-[52px] py-2 text-left">
                        <span
                          className="w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: done ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.3)", background: done ? "var(--ep-ok)" : "transparent" }}
                        >
                          {done && <Check size={14} strokeWidth={3} className="text-(--ep-bg)" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-[15px] leading-snug ${done ? "text-(--ep-ink)/40 line-through" : "text-(--ep-strong)"}`}>{r.food.name}</span>
                          {r.have > 0 && <span className="block text-[11px] text-(--ep-ink)/45">{t("Tu en as")} {fmtGrams(r.have)}</span>}
                        </span>
                        <span className="text-right flex-shrink-0">
                          <span className={`block text-sm font-black tabular-nums ${done ? "text-(--ep-ink)/40" : "text-(--ep-strong)"}`}>{fmtGrams(r.buy)}</span>
                          {eq && <span className="block text-[11px] text-(--ep-ink)/45">{eq}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {checkedCount > 0 && (
            <button onClick={stockChecked} disabled={pending} className="w-full min-h-[48px] rounded-xl border border-(--ep-accent)/60 text-sm font-bold text-(--ep-strong) inline-flex items-center justify-center gap-2 disabled:opacity-50">
              <PackagePlus size={16} /> {t("Ranger les")} {checkedCount} {t("articles cochés dans mon stock")}
            </button>
          )}
        </>
      )}

      {covered.length > 0 && (
        <div className="bg-(--ep-s1) border border-(--ep-line)/20 rounded-2xl">
          <button onClick={() => setShowHave((v) => !v)} aria-expanded={showHave} className="w-full flex items-center gap-2 px-4 min-h-[48px] text-sm font-bold text-(--ep-ink)/65">
            <span className="flex-1 text-left">{t("Déjà chez toi")} ({covered.length})</span>
            <ChevronDown size={16} className={`transition-transform ${showHave ? "rotate-180" : ""}`} />
          </button>
          {showHave && (
            <ul className="px-4 pb-3 space-y-1.5">
              {covered.map((r) => (
                <li key={r.foodId} className="flex justify-between gap-3 text-sm text-(--ep-ink)/60">
                  <span className="truncate">{r.food.name}</span>
                  <span className="tabular-nums">{fmtGrams(r.grams)} / {fmtGrams(r.have)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
