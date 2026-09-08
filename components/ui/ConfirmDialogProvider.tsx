"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

// Remplace confirm() natif du navigateur (2026-09-08) : plus de 15 endroits
// dans l'appli (supprimer une photo, un post, un plan, annuler une séance,
// supprimer une section de formation...) affichaient une popup système grise,
// bloquante, qui casse totalement l'identité visuelle rouge sombre de
// l'appli — précisément pour les actions les plus destructrices, celles où
// une confirmation soignée compte le plus. Même API que confirm() natif
// (une promesse qui résout à true/false) pour que chaque appelant n'ait
// qu'à passer par useConfirm() + await plutôt que réécrire sa propre
// logique de dialogue.

export interface ConfirmOptions {
  /** Bouton de confirmation en rouge (par défaut, la quasi-totalité des cas sont des suppressions). */
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** À appeler à la place de confirm() natif : mêmes await/booléen en retour. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Filet de secours plutôt qu'un crash si jamais un composant est rendu
    // hors de RootLayout (tests, storybook futur...) : mieux vaut retomber
    // sur le comportement natif que casser l'action pour de bon.
    return async (message: string) => (typeof window !== "undefined" ? window.confirm(message) : false);
  }
  return ctx;
}

interface PendingConfirm {
  message: string;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export default function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((message, options = {}) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPending({ message, options, resolve });
    });
  }, []);

  function settle(value: boolean) {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") settle(false);
      if (e.key === "Enter") settle(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => settle(false)} />
          <div className="relative w-full sm:max-w-sm bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl z-10 p-5">
            <div className="flex items-start gap-3 mb-5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: pending.options.danger === false ? "rgba(224,30,30,0.08)" : "rgba(224,30,30,0.12)",
                  border: "1px solid rgba(224,30,30,0.3)",
                }}
              >
                <AlertTriangle size={16} className="text-[#E01E1E]" />
              </div>
              <p className="text-[13.5px] text-white leading-relaxed pt-1.5">{pending.message}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => settle(false)}
                autoFocus
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-[#F5EDED]/50 hover:text-white transition-colors"
              >
                {pending.options.cancelLabel ?? "Annuler"}
              </button>
              <button
                onClick={() => settle(true)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-xl transition-colors"
              >
                {pending.options.confirmLabel ?? "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
