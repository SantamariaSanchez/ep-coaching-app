"use client";

// Courses, version inventaire (2026-10-07) : retour direct du fondateur,
// « j'ai acheté 3 bananes, je logue 1 banane, il doit m'en rester 2, et je
// sais quand racheter sans aller voir mes placards ». Trois volets :
// - À racheter : ce qui manque pour la semaine (plan ou habitudes) et ce qui
//   est vide ou sous le seuil ; cocher « acheté » le met directement en stock.
// - Mon stock : le placard et le frigo dans l'appli, qui baissent tout seuls
//   à chaque repas noté (déclencheur en base sur food_logs).
// - Semaine : les besoins de la semaine face au stock.
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Check, Minus, Package, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { addToPantryAction, adjustPantryAction, deletePantryItemAction, getPantryAction, updatePantryItemAction } from "@/app/actions/pantry";
import { buildBuyList, formatQuantity, guessPieceWeight, statusOf, stepFor, suggestUnit, toGrams, type BuySuggestion, type NeedItem, type PantryItem, type PantryUnit } from "@/lib/pantry";
import { fuzzyFilter } from "@/lib/fuzzy-search";
import type { Food } from "@/utils/nutrition";

type View = "racheter" | "stock" | "semaine";

const UNIT_LABELS: Record<PantryUnit, string> = { piece: "Pièces", g: "Grammes", ml: "Millilitres" };

export default function GroceryHub({ needs, source, foods }: { needs: NeedItem[]; source: "plan" | "habitudes"; foods: Food[] }) {
  const [items, setItems] = useState<PantryItem[] | null>(null);
  const [view, setView] = useState<View>("racheter");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reload = useCallback(async () => {
    const res = await getPantryAction();
    if (res.error) setError(res.error);
    setItems(res.items);
  }, []);

  useEffect(() => {
    // Chargement initial du stock (les repas notés depuis le dernier passage
    // ont déjà été retirés en base).
    let alive = true;
    getPantryAction().then((res) => {
      if (!alive) return;
      if (res.error) setError(res.error);
      setItems(res.items);
      if (res.items.length > 0) setView("stock");
    });
    return () => {
      alive = false;
    };
  }, []);

  const dailyByFood = useMemo(() => new Map(needs.map((n) => [n.foodId, n.totalGrams / 7])), [needs]);
  const buyList = useMemo(() => (items ? buildBuyList(items, needs) : []), [items, needs]);
  const lowCount = useMemo(() => (items ?? []).filter((i) => statusOf(i, i.food_id ? dailyByFood.get(i.food_id) : undefined).status !== "ok").length, [items, dailyByFood]);

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      await reload();
    });
  }

  function bump(item: PantryItem, dir: 1 | -1) {
    const next = Math.max(0, item.quantity + dir * stepFor(item.unit));
    setItems((prev) => prev?.map((i) => (i.id === item.id ? { ...i, quantity: next } : i)) ?? prev);
    run(() => adjustPantryAction(item.id, next));
  }

  function markBought(s: BuySuggestion, quantity: number) {
    run(() => addToPantryAction([{ foodId: s.foodId, name: s.name, category: s.category, unit: s.unit, quantity, gramsPerUnit: s.gramsPerUnit }]));
  }

  return (
    <div className="space-y-4">
      {/* Résumé + bascule des volets */}
      <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart size={15} className="text-[#E01E1E]" />
          <p className="text-[11px] text-[#F5EDED]/60 leading-snug flex-1">
            {items === null
              ? "Chargement de ton stock..."
              : items.length === 0
                ? "Ajoute ce que tu as chez toi : ton stock baisse tout seul à chaque repas noté."
                : `${items.length} article${items.length > 1 ? "s" : ""} en stock${lowCount ? ` · ${lowCount} à surveiller` : ""}. Le stock baisse tout seul quand tu notes un repas.`}
          </p>
        </div>
        <div role="tablist" aria-label="Courses" className="grid grid-cols-3 gap-1 bg-[#150000] rounded-lg p-1">
          {([
            ["racheter", `À racheter${buyList.length ? ` (${buyList.length})` : ""}`],
            ["stock", "Mon stock"],
            ["semaine", "Semaine"],
          ] as [View, string][]).map(([v, label]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`min-h-[40px] rounded-md text-[11px] font-bold transition-colors ${view === v ? "bg-[#E01E1E] text-white" : "text-[#F5EDED]/55"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}

      {view === "racheter" && (
        <BuyListView suggestions={buyList} source={source} onBought={markBought} pending={pending} onAll={() => run(() => addToPantryAction(buyList.map((s) => ({ foodId: s.foodId, name: s.name, category: s.category, unit: s.unit, quantity: s.quantity, gramsPerUnit: s.gramsPerUnit }))))} />
      )}

      {view === "stock" && (
        <div className="space-y-3">
          <button onClick={() => setAdding(true)} className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#E01E1E] text-white text-sm font-bold">
            <Plus size={16} /> Ajouter des courses
          </button>
          {items && items.length === 0 && (
            <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-8 px-4 text-center">
              <Package size={22} className="mx-auto text-[#F5EDED]/25 mb-2" />
              <p className="text-xs text-[#F5EDED]/45">Ton stock est vide. Ajoute tes courses, ou coche ce que tu as acheté dans « À racheter ».</p>
            </div>
          )}
          {groupByCategory(items ?? []).map(([category, list]) => (
            <div key={category} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">{category}</p>
              <ul className="space-y-1">
                {list.map((item) => {
                  const st = statusOf(item, item.food_id ? dailyByFood.get(item.food_id) : undefined);
                  return (
                    <li key={item.id} className="flex items-center gap-2">
                      <button onClick={() => setEditing(item)} className="flex-1 min-w-0 text-left py-2">
                        <span className="block text-sm text-white truncate">{item.name}</span>
                        <span className="flex items-center gap-1.5 text-[11px] text-[#F5EDED]/45">
                          {formatQuantity(item.quantity, item.unit)}
                          {st.status === "vide" && <span className="text-red-400 font-bold">· Vide</span>}
                          {st.status === "bas" && <span className="text-amber-400 font-bold">· Bientôt vide</span>}
                          {st.status === "ok" && st.daysLeft != null && <span>· ≈ {Math.max(1, Math.round(st.daysLeft))} j</span>}
                        </span>
                      </button>
                      <button aria-label={`Retirer ${item.name}`} onClick={() => bump(item, -1)} className="w-10 h-10 rounded-lg border border-[#890404]/40 flex items-center justify-center text-[#F5EDED]/70">
                        <Minus size={15} />
                      </button>
                      <button aria-label={`Ajouter ${item.name}`} onClick={() => bump(item, 1)} className="w-10 h-10 rounded-lg border border-[#890404]/40 flex items-center justify-center text-[#F5EDED]/70">
                        <Plus size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {view === "semaine" && (
        <div className="space-y-2">
          <p className="text-[11px] text-[#F5EDED]/50 px-1">
            {source === "plan" ? "Besoins de la semaine d'après ton plan, face à ton stock." : "Besoins de la semaine d'après ce que tu manges le plus, face à ton stock."}
          </p>
          {needs.length === 0 ? (
            <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-8 text-center">
              <p className="text-xs text-[#F5EDED]/40">Pas encore assez de données. Note tes repas quelques jours, ou demande un plan à ton coach.</p>
            </div>
          ) : (
            <ul className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-3 space-y-2">
              {needs.map((n) => {
                const item = items?.find((i) => i.food_id === n.foodId);
                const have = item ? toGrams(item) : 0;
                const pct = Math.min(100, Math.round((have / Math.max(1, n.totalGrams)) * 100));
                return (
                  <li key={n.foodId}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white truncate">{n.name}</span>
                      <span className="text-[11px] text-[#F5EDED]/50">{Math.round(have)} / {n.totalGrams} g</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#150000] mt-1 overflow-hidden" aria-hidden="true">
                      <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-[#E01E1E]"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {adding && <AddSheet foods={foods} onClose={() => setAdding(false)} onAdd={(p) => { setAdding(false); run(() => addToPantryAction([p])); }} />}
      {editing && (
        <EditSheet
          item={editing}
          onClose={() => setEditing(null)}
          onSave={(qty, fields) => {
            const id = editing.id;
            setEditing(null);
            run(async () => {
              const a = await updatePantryItemAction(id, fields);
              if (a.error) return a;
              return adjustPantryAction(id, qty);
            });
          }}
          onDelete={() => {
            const id = editing.id;
            setEditing(null);
            run(() => deletePantryItemAction(id));
          }}
        />
      )}
    </div>
  );
}

function groupByCategory(items: PantryItem[]): [string, PantryItem[]][] {
  const map = new Map<string, PantryItem[]>();
  for (const i of items) map.set(i.category || "Divers", [...(map.get(i.category || "Divers") ?? []), i]);
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
}

function BuyListView({ suggestions, source, onBought, onAll, pending }: { suggestions: BuySuggestion[]; source: "plan" | "habitudes"; onBought: (s: BuySuggestion, q: number) => void; onAll: () => void; pending: boolean }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  if (suggestions.length === 0) {
    return (
      <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-8 px-4 text-center">
        <Check size={22} className="mx-auto text-emerald-400 mb-2" />
        <p className="text-xs text-[#F5EDED]/55">Rien à racheter pour l&apos;instant. Ton stock couvre la semaine.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[#F5EDED]/50 px-1">
        {source === "plan" ? "Ce qui manque pour tenir ton plan cette semaine, plus ce qui est vide chez toi." : "Ce qui manque d'après tes habitudes, plus ce qui est vide chez toi."} Coche ce que tu as acheté : ça passe direct en stock.
      </p>
      <ul className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-2 divide-y divide-[#890404]/15">
        {suggestions.map((s) => {
          const q = qty[s.key] ?? s.quantity;
          return (
            <li key={s.key} className="flex items-center gap-2 py-1.5">
              <button
                aria-label={`J'ai acheté ${s.name}`}
                disabled={pending}
                onClick={() => onBought(s, q)}
                className="w-10 h-10 rounded-lg border border-[#890404]/50 flex items-center justify-center text-[#F5EDED]/60 hover:border-[#E01E1E] hover:text-white"
              >
                <Check size={16} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{s.name}</p>
                <p className="text-[10px] text-[#F5EDED]/40">{s.reason === "plan" ? "Pour la semaine" : "Vide ou presque"}</p>
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={stepFor(s.unit)}
                value={q}
                onChange={(e) => setQty((prev) => ({ ...prev, [s.key]: Number(e.target.value) }))}
                aria-label={`Quantité de ${s.name}`}
                className="w-20 h-10 rounded-lg bg-[#150000] border border-[#890404]/30 text-right px-2 text-sm text-white"
              />
              <span className="w-12 text-[11px] text-[#F5EDED]/45">{s.unit === "piece" ? "pièce(s)" : s.unit}</span>
            </li>
          );
        })}
      </ul>
      <button disabled={pending} onClick={onAll} className="w-full min-h-[44px] rounded-xl border border-[#E01E1E]/60 text-sm font-bold text-white">
        J&apos;ai tout acheté
      </button>
    </div>
  );
}

function SheetFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#1a0101] border border-[#890404]/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-white">{title}</p>
          <button aria-label="Fermer" onClick={onClose} className="w-10 h-10 flex items-center justify-center text-[#F5EDED]/60"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddSheet({ foods, onClose, onAdd }: { foods: Food[]; onClose: () => void; onAdd: (p: { foodId: string | null; name: string; category: string; unit: PantryUnit; quantity: number; gramsPerUnit: number | null; lowThreshold: number | null }) => void }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{ foodId: string | null; name: string; category: string } | null>(null);
  const [unit, setUnit] = useState<PantryUnit>("g");
  const [quantity, setQuantity] = useState("");
  const [gpu, setGpu] = useState("");
  const [threshold, setThreshold] = useState("");
  const results = useMemo(() => (query.trim().length >= 2 ? fuzzyFilter(foods, (f) => [f.name, f.category], query).slice(0, 8) : []), [foods, query]);

  function pick(p: { foodId: string | null; name: string; category: string }) {
    const u = suggestUnit(p.name, p.category);
    setPicked(p);
    setUnit(u);
    setGpu(String(guessPieceWeight(p.name) ?? 100));
    setQuantity(u === "piece" ? "1" : u === "ml" ? "1000" : "500");
  }

  return (
    <SheetFrame title={picked ? picked.name : "Ajouter des courses"} onClose={onClose}>
      {!picked ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 rounded-xl bg-[#150000] border border-[#890404]/40 px-3">
            <Search size={15} className="text-[#F5EDED]/40" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Banane, riz, poulet..." aria-label="Chercher un aliment" className="flex-1 h-11 bg-transparent text-sm text-white outline-none" />
          </label>
          <ul className="space-y-1">
            {results.map((f) => (
              <li key={f.id}>
                <button onClick={() => pick({ foodId: f.id, name: f.name, category: f.category ?? "Divers" })} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#2a0303]">
                  <span className="text-sm text-white">{f.name}</span>
                  <span className="block text-[10px] text-[#F5EDED]/40">{f.category ?? "Divers"}</span>
                </button>
              </li>
            ))}
            {query.trim().length >= 2 && (
              <li>
                <button onClick={() => pick({ foodId: null, name: query.trim(), category: "Divers" })} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-[#F5EDED]/70 hover:bg-[#2a0303]">
                  Ajouter « {query.trim()} » sans fiche aliment
                  <span className="block text-[10px] text-[#F5EDED]/40">Il ne baissera pas tout seul avec tes repas.</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1 bg-[#150000] rounded-lg p-1" role="radiogroup" aria-label="Unité">
            {(Object.keys(UNIT_LABELS) as PantryUnit[]).map((u) => (
              <button key={u} role="radio" aria-checked={unit === u} onClick={() => setUnit(u)} className={`min-h-[40px] rounded-md text-xs font-bold ${unit === u ? "bg-[#E01E1E] text-white" : "text-[#F5EDED]/55"}`}>{UNIT_LABELS[u]}</button>
            ))}
          </div>
          <NumberField label={unit === "piece" ? "Combien de pièces ?" : unit === "ml" ? "Combien de ml ?" : "Combien de grammes ?"} value={quantity} onChange={setQuantity} />
          {unit === "piece" && <NumberField label="Poids d'une pièce (g)" value={gpu} onChange={setGpu} hint="Sert à retirer la bonne quantité quand tu notes un repas en grammes." />}
          <NumberField label="Me prévenir sous (facultatif)" value={threshold} onChange={setThreshold} hint={`En ${unit === "piece" ? "pièces" : unit}. Sinon, l'alerte se base sur ta consommation.`} />
          <button
            onClick={() => onAdd({ ...picked, unit, quantity: Number(quantity) || 0, gramsPerUnit: unit === "piece" ? Number(gpu) || 100 : null, lowThreshold: threshold === "" ? null : Number(threshold) })}
            className="w-full min-h-[44px] rounded-xl bg-[#E01E1E] text-white text-sm font-bold"
          >
            Mettre en stock
          </button>
        </div>
      )}
    </SheetFrame>
  );
}

function EditSheet({ item, onClose, onSave, onDelete }: { item: PantryItem; onClose: () => void; onSave: (qty: number, fields: { unit: PantryUnit; gramsPerUnit: number | null; lowThreshold: number | null }) => void; onDelete: () => void }) {
  const [quantity, setQuantity] = useState(String(Math.round(item.quantity * 10) / 10));
  const [gpu, setGpu] = useState(String(item.grams_per_unit ?? guessPieceWeight(item.name) ?? 100));
  const [threshold, setThreshold] = useState(item.low_threshold == null ? "" : String(item.low_threshold));
  const unit = item.unit;
  return (
    <SheetFrame title={item.name} onClose={onClose}>
      <div className="space-y-3">
        <NumberField label={`Quantité en stock (${unit === "piece" ? "pièces" : unit})`} value={quantity} onChange={setQuantity} />
        {unit === "piece" && <NumberField label="Poids d'une pièce (g)" value={gpu} onChange={setGpu} />}
        <NumberField label="Me prévenir sous (facultatif)" value={threshold} onChange={setThreshold} />
        <button onClick={() => onSave(Number(quantity) || 0, { unit, gramsPerUnit: unit === "piece" ? Number(gpu) || 100 : null, lowThreshold: threshold === "" ? null : Number(threshold) })} className="w-full min-h-[44px] rounded-xl bg-[#E01E1E] text-white text-sm font-bold">
          Enregistrer
        </button>
        <button onClick={onDelete} className="w-full min-h-[44px] rounded-xl border border-red-500/40 text-red-300 text-sm font-bold flex items-center justify-center gap-2">
          <Trash2 size={15} /> Retirer du stock
        </button>
      </div>
    </SheetFrame>
  );
}

function NumberField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#F5EDED]/70">{label}</span>
      <input type="number" inputMode="decimal" min={0} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-11 rounded-xl bg-[#150000] border border-[#890404]/40 px-3 text-sm text-white" />
      {hint && <span className="block mt-1 text-[10px] text-[#F5EDED]/40">{hint}</span>}
    </label>
  );
}
