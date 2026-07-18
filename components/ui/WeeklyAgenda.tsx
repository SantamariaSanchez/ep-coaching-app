"use client";

import { useState } from "react";
import { Plus, Trash2, X, Clock } from "lucide-react";
import type { ScheduleBlock } from "@/utils/agenda";

const DAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const inputClass =
  "w-full bg-[#150000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none transition-colors";
const labelClass = "block text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

const COLOR_OPTIONS = ["#E01E1E", "#4ade80", "#60a5fa", "#fbbf24", "#a78bfa", "#f472b6"];

interface BlockFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string;
  color: string;
  notes: string | null;
}

function emptyForm(day: number): BlockFormData {
  return { day_of_week: day, start_time: "09:00", end_time: "10:00", label: "", color: COLOR_OPTIONS[0], notes: null };
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
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [form, setForm] = useState<BlockFormData>(emptyForm(1));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd(day: number) {
    setForm(emptyForm(day));
    setEditingBlockId(null);
    setEditingDay(day);
    setError(null);
  }

  function openEdit(block: ScheduleBlock) {
    setForm({
      day_of_week: block.day_of_week,
      start_time: block.start_time.slice(0, 5),
      end_time: block.end_time.slice(0, 5),
      label: block.label,
      color: block.color,
      notes: block.notes,
    });
    setEditingBlockId(block.id);
    setEditingDay(block.day_of_week);
    setError(null);
  }

  function close() {
    setEditingDay(null);
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
      setBlocks((prev) => prev.map((b) => (b.id === editingBlockId ? { ...b, ...form, start_time: form.start_time + ":00", end_time: form.end_time + ":00" } : b)));
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
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const dayBlocks = blocks.filter((b) => b.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
          return (
            <div key={day} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-2.5">
                {DAY_LABELS[day]}
              </p>
              <div className="space-y-1.5">
                {dayBlocks.map((block) => (
                  <button
                    key={block.id}
                    onClick={() => editable && openEdit(block)}
                    disabled={!editable}
                    className="w-full text-left rounded-lg px-2.5 py-2 border transition-colors"
                    style={{
                      background: `${block.color}15`,
                      borderColor: `${block.color}40`,
                      cursor: editable ? "pointer" : "default",
                    }}
                  >
                    <p className="text-xs font-bold text-white truncate">{block.label}</p>
                    <p className="text-[10px] text-[#F5EDED]/50 flex items-center gap-1 mt-0.5">
                      <Clock size={9} />
                      {block.start_time.slice(0, 5)} – {block.end_time.slice(0, 5)}
                    </p>
                    {block.notes && <p className="text-[9px] text-[#F5EDED]/30 mt-1">{block.notes}</p>}
                  </button>
                ))}
                {dayBlocks.length === 0 && (
                  <p className="text-[10px] text-[#F5EDED]/20 italic py-1">Rien de prévu</p>
                )}
              </div>
              {editable && (
                <button
                  onClick={() => openAdd(day)}
                  className="w-full flex items-center justify-center gap-1 mt-2 text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#E01E1E] border border-dashed border-[#890404]/25 hover:border-[#890404]/50 rounded-lg py-1.5 transition-colors"
                >
                  <Plus size={10} /> Ajouter
                </button>
              )}
            </div>
          );
        })}
      </div>

      {editingDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full max-w-sm bg-[#150000] border border-[#890404]/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-widest text-white">
                {editingBlockId ? "Modifier le bloc" : `Nouveau bloc — ${DAY_LABELS[editingDay]}`}
              </p>
              <button onClick={close} className="text-[#F5EDED]/40 hover:text-white">
                <X size={18} />
              </button>
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
