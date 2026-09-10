"use client";

import { useState } from "react";
import { Plus, Pill, X, RotateCcw, Trash2 } from "lucide-react";
import type { ClientSupplement } from "@/utils/supplements";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

const TIMING_SUGGESTIONS = [
  "Matin",
  "Midi",
  "Soir",
  "Avant entraînement",
  "Après entraînement",
  "Au coucher",
  "Avec repas",
];

export default function SupplementsSection({
  supplements,
  isCoachView = false,
  onAdd,
  onSetStatus,
  onDelete,
}: {
  supplements: ClientSupplement[];
  isCoachView?: boolean;
  onAdd: (input: { name: string; dosage?: string; timing?: string; notes?: string }) => Promise<{ error?: string }>;
  onSetStatus: (id: string, status: "active" | "stopped") => Promise<{ error?: string }>;
  onDelete: (id: string) => Promise<{ error?: string }>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [timing, setTiming] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const active = supplements.filter((s) => s.status === "active");
  const stopped = supplements.filter((s) => s.status === "stopped");

  async function handleAdd() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    const result = await onAdd({
      name,
      dosage: dosage || undefined,
      timing: timing || undefined,
      notes: notes || undefined,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setDosage("");
    setTiming("");
    setNotes("");
    setShowForm(false);
  }

  async function handleToggle(s: ClientSupplement) {
    setBusyId(s.id);
    await onSetStatus(s.id, s.status === "active" ? "stopped" : "active");
    setBusyId(null);
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    await onDelete(id);
    setBusyId(null);
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Pill size={14} className="text-[#E01E1E]" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40">
            Compléments alimentaires
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? "Fermer" : isCoachView ? "Suggérer" : "Ajouter"}
        </button>
      </div>
      <p className="text-[10px] text-[#F5EDED]/25 mb-4">
        {isCoachView
          ? "Liste des compléments de ce client. Ajoute une suggestion, il la verra dans son espace nutrition."
          : "Ta liste de compléments : nom, dosage, moment de prise. Ton coach peut aussi t'en suggérer."}
      </p>

      {showForm && (
        <div className="bg-[#150000] border border-[#890404]/25 rounded-xl p-4 mb-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom (ex. Créatine monohydrate)" aria-label="Nom (ex. Créatine monohydrate)"
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="Dosage (ex. 5g)" aria-label="Dosage (ex. 5g)"
              className={inputCls}
            />
            <input
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              placeholder="Moment de prise" aria-label="Moment de prise"
              list="supplement-timing-options"
              className={inputCls}
            />
            <datalist id="supplement-timing-options">
              {TIMING_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optionnel)" aria-label="Notes (optionnel)"
            rows={2}
            className={inputCls + " resize-none"}
          />
          {error && <p className="text-[11px] text-red-400 font-semibold">⚠ {error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              disabled={!name.trim() || saving}
              className="bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? "Ajout…" : isCoachView ? "Suggérer" : "Ajouter"}
            </button>
          </div>
        </div>
      )}

      {supplements.length === 0 && !showForm ? (
        <p className="text-xs text-[#F5EDED]/25 text-center py-4">
          {isCoachView ? "Aucun complément renseigné pour ce client." : "Aucun complément renseigné pour l'instant."}
        </p>
      ) : (
        <div className="space-y-2">
          {[...active, ...stopped].map((s) => (
            <div
              key={s.id}
              className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 border ${
                s.status === "stopped"
                  ? "border-[#890404]/10 bg-[#150000]/40 opacity-50"
                  : "border-[#890404]/20 bg-[#150000]"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {s.name}
                  {s.dosage && <span className="text-[#F5EDED]/40 font-normal"> · {s.dosage}</span>}
                </p>
                <p className="text-[10px] text-[#F5EDED]/35 mt-0.5">
                  {s.timing && <span>{s.timing}</span>}
                  {s.suggested_by && (
                    <span className="text-amber-400/70">
                      {s.timing ? " · " : ""}Suggéré par {s.suggested_by_name ?? "ton coach"}
                    </span>
                  )}
                </p>
                {s.notes && <p className="text-[10px] text-[#F5EDED]/25 mt-1">{s.notes}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggle(s)}
                  disabled={busyId === s.id}
                  title={s.status === "active" ? "Arrêter" : "Reprendre"} aria-label={s.status === "active" ? "Arrêter" : "Reprendre"}
                  className={`text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-30 ${
                    s.status === "active"
                      ? "text-[#F5EDED]/30 hover:text-amber-400"
                      : "text-[#F5EDED]/30 hover:text-green-400"
                  }`}
                >
                  {s.status === "active" ? "Arrêter" : <RotateCcw size={12} />}
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={busyId === s.id}
                  aria-label={`Supprimer ${s.name}`}
                  className="text-[#F5EDED]/20 hover:text-red-400 transition-colors disabled:opacity-30"
                >
                  <Trash2 size={12} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
