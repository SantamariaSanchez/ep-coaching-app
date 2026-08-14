"use client";

import { useState, useEffect } from "react";
import { X, Check, Users, AlertCircle } from "lucide-react";
import type { ApplyTemplateClient } from "./ApplyTemplateModal";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

// Item 11 (actions groupées) : même geste que ApplyTemplateModal, mais pour
// décaler l'objectif calorique de plusieurs clients à la fois au lieu
// d'appliquer un modèle. Composant séparé plutôt que de complexifier
// ApplyTemplateModal avec un champ optionnel qui ne concerne qu'un seul cas.
export default function BulkCalorieAdjustModal({
  clients,
  onApply,
  onClose,
}: {
  clients: ApplyTemplateClient[];
  onApply: (clientIds: string[], deltaKcal: number) => Promise<{ error?: string; appliedCount?: number }>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [delta, setDelta] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  // MASTERCLASS.md Axe C (suite) : le fond se fermait déjà au clic, rien
  // au clavier avant ça.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApply() {
    const deltaNum = parseFloat(delta);
    if (selected.size === 0) {
      setError("Sélectionne au moins un client.");
      return;
    }
    if (!Number.isFinite(deltaNum) || deltaNum === 0) {
      setError("Indique un écart de calories (positif ou négatif).");
      return;
    }
    setError(null);
    setBusy(true);
    const res = await onApply(Array.from(selected), deltaNum);
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else {
      setResult(res.appliedCount ?? selected.size);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="ep-modal-overlay absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="ep-modal-panel relative w-full sm:max-w-md bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col z-10">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#890404]/20 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">Ajuster les calories</p>
            <p className="text-sm font-bold text-white truncate">Plusieurs clients à la fois</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-[#F5EDED]/40 hover:text-white flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {result !== null ? (
          <div className="flex flex-col items-center gap-3 py-12 px-5">
            <Check size={36} className="text-green-400" />
            <p className="text-sm font-bold text-white text-center">
              Objectif ajusté pour {result} client{result !== 1 ? "s" : ""}, grammages du plan actif recalculés.
            </p>
            <button
              onClick={onClose}
              className="mt-2 text-xs font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444]"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 pt-4 pb-2 flex-shrink-0">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                Écart de calories (kcal)
              </label>
              <input
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="ex : +200 ou -150" aria-label="ex : +200 ou -150"
                className={inputCls}
              />
              <p className="text-[10px] text-[#F5EDED]/25 mt-1.5">
                Les glucides absorbent l&apos;écart, protéines et lipides restent inchangés. Le plan de
                diète actif de chaque client sélectionné est réajusté automatiquement.
              </p>
            </div>

            <div className="px-5 pt-2 pb-1 flex items-center gap-1.5 flex-shrink-0">
              <Users size={12} className="text-[#F5EDED]/30" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
                {clients.length} client{clients.length !== 1 ? "s" : ""} · {selected.size} sélectionné{selected.size !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2">
              {clients.length === 0 ? (
                <p className="text-xs text-[#F5EDED]/25 italic text-center py-6">Aucun client actif pour l&apos;instant.</p>
              ) : (
                clients.map((c) => {
                  const checked = selected.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg transition-colors ${
                        checked ? "bg-[#E01E1E]/10" : "hover:bg-[#1f0101]"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${
                          checked ? "bg-[#E01E1E] border-[#E01E1E]" : "border-[#890404]/40"
                        }`}
                      >
                        {checked && <Check size={11} className="text-white" />}
                      </span>
                      <span className="text-sm text-white truncate">{c.full_name ?? "Client"}</span>
                    </button>
                  );
                })
              )}
            </div>

            {error && (
              <div className="mx-5 mb-2 flex items-center gap-2 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2 flex-shrink-0">
                <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="px-5 py-4 border-t border-[#890404]/20 flex-shrink-0">
              <button
                onClick={handleApply}
                disabled={busy || selected.size === 0}
                className="w-full py-3 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-xl disabled:opacity-50 transition-colors"
              >
                {busy ? "Application…" : `Ajuster pour ${selected.size || ""} client${selected.size !== 1 ? "s" : ""}`.replace("  ", " ")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
