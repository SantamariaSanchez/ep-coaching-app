"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChefHat, ChevronDown, Sun, X } from "lucide-react";
import { RECIPES } from "@/lib/recipes-data";
import { fmtGrams, matchRecipe, simpleEquivalent } from "@/lib/diet-day";
import type { Food } from "@/utils/nutrition";

// Mode « Je cuisine » (2026-10-14). Retour direct du fondateur : « pendant
// que je fais le repas, que l'appli reste ouverte assez longtemps pour que
// quand je rallume mon tel elle soit encore là ». Donc :
// - gros texte, quantités exactes et équivalents simples, cases à cocher ;
// - écran gardé allumé (API Wake Lock), repris au retour sur l'appli (le
//   navigateur libère le verrou dès que la page passe en arrière-plan) ;
// - la vue est mémorisée sur l'appareil (voir COOK_KEY) : si le téléphone se
//   verrouille quand même ou si l'appli est rechargée, elle se rouvre telle
//   quelle, cases cochées comprises.

export const COOK_KEY = "ep-cook-session";
const COOK_TTL_MS = 4 * 3600 * 1000;

export interface CookSession {
  date: string;
  slot: string;
  portions: number;
  checked: string[];
  at: number;
}

export function readCookSession(today: string): CookSession | null {
  try {
    const raw = localStorage.getItem(COOK_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as CookSession;
    if (s.date !== today || Date.now() - s.at > COOK_TTL_MS) return null;
    return s;
  } catch {
    return null;
  }
}

function writeCookSession(s: CookSession | null) {
  try {
    if (s) localStorage.setItem(COOK_KEY, JSON.stringify(s));
    else localStorage.removeItem(COOK_KEY);
  } catch {
    // Stockage indisponible : la vue marche quand même, sans reprise.
  }
}

export interface CookItem {
  key: string;
  food: Food;
  grams: number;
  note?: string | null;
}

type WakeState = "on" | "off" | "unsupported";

function useScreenWakeLock(): WakeState {
  const [state, setState] = useState<WakeState>(() =>
    typeof navigator !== "undefined" && "wakeLock" in navigator ? "off" : "unsupported"
  );
  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let alive = true;
    async function acquire() {
      if (document.visibilityState !== "visible" || sentinel) return;
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (!alive) {
          sentinel.release().catch(() => {});
          return;
        }
        setState("on");
        sentinel.addEventListener("release", () => {
          sentinel = null;
          if (alive) setState("off");
        });
      } catch {
        if (alive) setState("off");
      }
    }
    acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    // Sur certains navigateurs le premier appel exige un geste : on retente
    // au premier tap dans la vue.
    document.addEventListener("pointerdown", onVisible, { passive: true });
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("pointerdown", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, []);
  return state;
}

export default function CookMode({
  date,
  slot,
  title,
  time,
  items,
  initial,
  onClose,
  onDone,
}: {
  date: string;
  slot: string;
  title: string;
  time: string;
  items: CookItem[];
  initial?: CookSession | null;
  onClose: () => void;
  /** « C'est prêt, j'ai mangé » : coche le repas. */
  onDone?: () => void;
}) {
  const t = useT();
  const wake = useScreenWakeLock();
  const [portions, setPortions] = useState(initial?.portions ?? 1);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initial?.checked ?? []));

  useEffect(() => {
    writeCookSession({ date, slot, portions, checked: [...checked], at: Date.now() });
  }, [date, slot, portions, checked]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const recipe = useMemo(() => matchRecipe(RECIPES, items.map((i) => i.food)), [items]);
  const prepNotes = useMemo(() => {
    const out: { name: string; text: string }[] = [];
    for (const i of items) {
      if (i.note?.trim()) out.push({ name: i.food.name, text: i.note.trim() });
      if (i.food.prep_notes?.trim()) out.push({ name: i.food.name, text: i.food.prep_notes.trim() });
    }
    return out;
  }, [items]);

  function close() {
    writeCookSession(null);
    onClose();
  }

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const allChecked = items.length > 0 && items.every((i) => checked.has(i.key));

  if (typeof document === "undefined") return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${t("Je cuisine")} : ${title}`} className="fixed inset-0 z-[2147483000] flex flex-col bg-(--ep-bg)">
      <header className="flex items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 border-b border-(--ep-line)/20">
        <ChefHat size={22} className="text-(--ep-accent-hi2) flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xl font-black text-(--ep-strong) truncate">{title}</p>
          <p className="text-xs text-(--ep-ink)/50">
            {time}
            {wake === "on" && (
              <span className="ml-2 inline-flex items-center gap-1 text-(--ep-ok)">
                <Sun size={11} /> {t("Écran gardé allumé")}
              </span>
            )}
          </p>
        </div>
        <button onClick={close} aria-label={t("Fermer")} className="w-12 h-12 rounded-xl border border-(--ep-line)/30 flex items-center justify-center text-(--ep-ink)/70">
          <X size={22} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">
        {wake === "unsupported" && (
          <p className="text-xs text-(--ep-ink)/50 bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl px-3 py-2">
            {t("Ton téléphone ne permet pas de garder l'écran allumé depuis l'appli. Pas grave : si l'écran se verrouille, cette vue se rouvre telle quelle.")}
          </p>
        )}

        {/* Portions : cuisiner plusieurs repas d'un coup */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45 mb-2">{t("Je prépare")}</p>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t("Nombre de repas")}>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={portions === n}
                onClick={() => setPortions(n)}
                className={`min-h-[48px] rounded-xl text-base font-black border ${portions === n ? "bg-(--ep-accent) border-(--ep-accent) text-(--ep-strong)" : "border-(--ep-line)/30 text-(--ep-ink)/70"}`}
              >
                {n === 1 ? t("1 repas") : `× ${n}`}
              </button>
            ))}
          </div>
        </div>

        {/* Ingrédients */}
        <ul className="space-y-2">
          {items.map((i) => {
            const g = i.grams * portions;
            const eq = simpleEquivalent(i.food, g);
            const done = checked.has(i.key);
            return (
              <li key={i.key}>
                <button
                  onClick={() => toggle(i.key)}
                  aria-pressed={done}
                  className={`w-full flex items-center gap-4 text-left rounded-2xl border px-4 py-4 transition-colors ${done ? "border-(--ep-ok)/40 bg-(--ep-ok)/[0.07]" : "border-(--ep-line)/25 bg-(--ep-s1)"}`}
                >
                  <span
                    className="w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: done ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.3)", background: done ? "var(--ep-ok)" : "transparent" }}
                  >
                    {done && <Check size={20} strokeWidth={3} className="text-(--ep-bg)" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[22px] leading-tight font-black tabular-nums ${done ? "text-(--ep-ink)/45 line-through" : "text-(--ep-strong)"}`}>{fmtGrams(g)}</span>
                    <span className={`block text-lg leading-snug ${done ? "text-(--ep-ink)/40" : "text-(--ep-ink)/85"}`}>{i.food.name}</span>
                    {eq && <span className="block text-sm text-(--ep-ink)/50 mt-0.5">{eq}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {prepNotes.length > 0 && (
          <div className="rounded-2xl border border-(--ep-line)/25 bg-(--ep-s1) p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45 mb-2">{t("Préparation")}</p>
            <ul className="space-y-2 text-base text-(--ep-ink)/85 leading-relaxed">
              {prepNotes.map((n, idx) => (
                <li key={idx}>
                  <b className="text-(--ep-strong)">{n.name}</b> : {n.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recipe && (
          <details className="group rounded-2xl border border-(--ep-line)/25 bg-(--ep-s1)">
            <summary className="list-none cursor-pointer flex items-center gap-2 px-4 min-h-[52px]">
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45">{t("Idée de recette avec ces aliments")}</span>
                <span className="block text-base font-bold text-(--ep-strong) truncate">{recipe.name}</span>
              </span>
              <ChevronDown size={18} className="text-(--ep-ink)/40 transition-transform group-open:rotate-180" />
            </summary>
            <ol className="px-4 pb-4 space-y-3 list-decimal list-inside text-base text-(--ep-ink)/85 leading-relaxed marker:font-black marker:text-(--ep-accent-hi2)">
              {recipe.steps.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ol>
            <p className="px-4 pb-4 text-xs text-(--ep-ink)/45">{t("Garde les quantités de ton plan ci-dessus, la recette sert de méthode.")}</p>
          </details>
        )}
      </div>

      <footer className="px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-(--ep-line)/20 flex gap-2">
        {onDone ? (
          <button
            onClick={() => {
              writeCookSession(null);
              onDone();
            }}
            className={`flex-1 min-h-[52px] rounded-2xl text-base font-black flex items-center justify-center gap-2 ${allChecked ? "bg-(--ep-accent) text-(--ep-strong)" : "border border-(--ep-accent)/50 text-(--ep-strong)"}`}
          >
            <Check size={18} /> {t("C'est prêt, j'ai mangé")}
          </button>
        ) : (
          <button onClick={close} className="flex-1 min-h-[52px] rounded-2xl border border-(--ep-line)/30 text-base font-bold text-(--ep-ink)/75">
            {t("Terminé")}
          </button>
        )}
      </footer>
    </div>,
    document.body
  );
}
