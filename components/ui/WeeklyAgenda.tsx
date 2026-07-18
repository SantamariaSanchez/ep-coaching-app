"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { ScheduleBlock } from "@/utils/agenda";

const inputClass =
  "w-full bg-[#150000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none transition-colors";
const labelClass = "block text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

const COLOR_OPTIONS = ["#E01E1E", "#4ade80", "#60a5fa", "#fbbf24", "#a78bfa", "#f472b6"];
const DAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAY_LABELS_SHORT = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Grille horaire 6h-23h — couvre la quasi-totalité des blocs réels (travail,
// salle, repas, sommeil du soir) sans avoir à scroller une grille de 24h.
const START_HOUR = 6;
const END_HOUR = 23;
const ROW_HEIGHT = 44; // px par heure
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const TOTAL_HEIGHT = HOURS.length * ROW_HEIGHT;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function blockTop(startTime: string): number {
  const mins = clamp(timeToMinutes(startTime), START_HOUR * 60, END_HOUR * 60) - START_HOUR * 60;
  return (mins / 60) * ROW_HEIGHT;
}

function blockHeight(startTime: string, endTime: string): number {
  const startMins = clamp(timeToMinutes(startTime), START_HOUR * 60, END_HOUR * 60);
  const endMins = clamp(timeToMinutes(endTime), START_HOUR * 60, END_HOUR * 60);
  return Math.max(18, ((endMins - startMins) / 60) * ROW_HEIGHT);
}

interface BlockFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string;
  color: string;
  notes: string | null;
}

function emptyForm(day: number, hour = 9): BlockFormData {
  const start = `${String(hour).padStart(2, "0")}:00`;
  const end = `${String(Math.min(hour + 1, 23)).padStart(2, "0")}:00`;
  return { day_of_week: day, start_time: start, end_time: end, label: "", color: COLOR_OPTIONS[0], notes: null };
}

export default function WeeklyAgenda({
  blocks: initialBlocks,
  editable,
  addScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
}: {
  blocks: ScheduleBlock[];
  editable: boolean;
  addScheduleBlock?: (data: BlockFormData) => Promise<{ error?: string; block?: ScheduleBlock }>;
  updateScheduleBlock?: (blockId: string, data: BlockFormData) => Promise<{ error?: string }>;
  deleteScheduleBlock?: (blockId: string) => Promise<{ error?: string }>;
}) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [form, setForm] = useState<BlockFormData>(emptyForm(1));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAddAt(day: number, hour: number) {
    if (!editable) return;
    setForm(emptyForm(day, hour));
    setEditingBlockId(null);
    setModalOpen(true);
    setError(null);
  }

  function openEdit(block: ScheduleBlock) {
    if (!editable) return;
    setForm({
      day_of_week: block.day_of_week,
      start_time: block.start_time.slice(0, 5),
      end_time: block.end_time.slice(0, 5),
      label: block.label,
      color: block.color,
      notes: block.notes,
    });
    setEditingBlockId(block.id);
    setModalOpen(true);
    setError(null);
  }

  function close() {
    setModalOpen(false);
    setEditingBlockId(null);
  }

  async function handleSave() {
    if (!form.label.trim()) {
      setError("Nom du bloc obligatoire.");
      return;
    }
    if (form.end_time <= form.start_time) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    setSaving(true);
    setError(null);

    if (editingBlockId) {
      const res = await updateScheduleBlock?.(editingBlockId, form);
      setSaving(false);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === editingBlockId
            ? { ...b, ...form, start_time: form.start_time + ":00", end_time: form.end_time + ":00" }
            : b
        )
      );
    } else {
      const res = await addScheduleBlock?.(form);
      setSaving(false);
      if (res?.error || !res?.block) {
        setError(res?.error ?? "Erreur.");
        return;
      }
      setBlocks((prev) => [...prev, res.block!]);
    }
    close();
  }

  async function handleDelete(blockId: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    await deleteScheduleBlock?.(blockId);
    close();
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto -mx-1 px-1" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="flex" style={{ minWidth: 760 }}>
          {/* Colonne des heures */}
          <div style={{ width: 40, flexShrink: 0 }}>
            <div style={{ height: 24 }} />
            <div className="relative" style={{ height: TOTAL_HEIGHT }}>
              {HOURS.map((h) => (
                <p
                  key={h}
                  className="absolute right-1 text-[9px] text-[#F5EDED]/25 font-semibold"
                  style={{ top: (h - START_HOUR) * ROW_HEIGHT - 6 }}
                >
                  {h}h
                </p>
              ))}
            </div>
          </div>

          {/* Colonnes des jours */}
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const dayBlocks = blocks.filter((b) => b.day_of_week === day);
            return (
              <div key={day} style={{ flex: 1, minWidth: 100 }}>
                <div className="flex items-center justify-center gap-1" style={{ height: 24 }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/40">
                    {DAY_LABELS_SHORT[day]}
                  </p>
                  {editable && (
                    <button
                      onClick={() => openAddAt(day, 9)}
                      className="text-[#F5EDED]/20 hover:text-[#E01E1E]"
                      title={`Ajouter le ${DAY_LABELS[day]}`}
                    >
                      <Plus size={10} />
                    </button>
                  )}
                </div>
                <div
                  className="relative border-l border-[#890404]/10"
                  style={{ height: TOTAL_HEIGHT }}
                >
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      onClick={() => openAddAt(day, h)}
                      className="absolute w-full border-t border-[#890404]/8 hover:bg-[#890404]/5 transition-colors"
                      style={{ top: (h - START_HOUR) * ROW_HEIGHT, height: ROW_HEIGHT, cursor: editable ? "pointer" : "default" }}
                    />
                  ))}
                  {dayBlocks.map((block) => (
                    <button
                      key={block.id}
                      onClick={() => openEdit(block)}
                      className="absolute left-0.5 right-0.5 rounded-md overflow-hidden text-left px-1.5 py-1 border"
                      style={{
                        top: blockTop(block.start_time),
                        height: blockHeight(block.start_time, block.end_time),
                        background: `${block.color}20`,
                        borderColor: `${block.color}55`,
                        cursor: editable ? "pointer" : "default",
                      }}
                    >
                      <p className="text-[9px] font-bold text-white leading-tight truncate">{block.label}</p>
                      <p className="text-[8px] text-[#F5EDED]/50 leading-tight">
                        {block.start_time.slice(0, 5)}–{block.end_time.slice(0, 5)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full max-w-sm bg-[#150000] border border-[#890404]/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-widest text-white">
                {editingBlockId ? "Modifier le bloc" : `Nouveau bloc — ${DAY_LABELS[form.day_of_week]}`}
              </p>
              <button onClick={close} className="text-[#F5EDED]/40 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className={labelClass}>Jour</label>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => setForm((f) => ({ ...f, day_of_week: d }))}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                      form.day_of_week === d
                        ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-white"
                        : "border-[#890404]/25 text-[#F5EDED]/40"
                    }`}
                  >
                    {DAY_LABELS_SHORT[d]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Nom</label>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ex. Salle, Travail, Repas..."
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Début</label>
                <input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fin</label>
                <input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Couleur</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="w-7 h-7 rounded-full border-2 transition-transform"
                    style={{ background: c, borderColor: form.color === c ? "#fff" : "transparent", transform: form.color === c ? "scale(1.1)" : "scale(1)" }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Notes (optionnel)</label>
              <textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
                className={`${inputClass} resize-none`}
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 pt-1">
              {editingBlockId && (
                <button
                  onClick={() => handleDelete(editingBlockId)}
                  className="flex items-center justify-center gap-1.5 border border-red-500/30 text-red-400 rounded-lg px-3 py-2.5"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-lg py-2.5 transition-colors"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
