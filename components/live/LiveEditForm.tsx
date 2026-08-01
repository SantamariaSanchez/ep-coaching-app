"use client";

import { useState } from "react";
import { Loader2, AlertCircle, X } from "lucide-react";
import { isOneToOneType, type LiveEvent } from "@/lib/live-types";
import type { UpdateLiveEventInput } from "@/app/dashboard/coach/live/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

function toLocalDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLocalTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function LiveEditForm({
  event,
  clients,
  onUpdate,
  onClose,
}: {
  event: LiveEvent;
  clients: { id: string; full_name: string | null }[];
  onUpdate: (id: string, input: UpdateLiveEventInput) => Promise<{ error?: string }>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [clientId, setClientId] = useState(event.invited_client_id ?? "");
  const [date, setDate] = useState(toLocalDate(event.starts_at));
  const [time, setTime] = useState(toLocalTime(event.starts_at));
  const [duration, setDuration] = useState(String(event.duration_minutes));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim() || !date || !time) {
      setError("Titre, date et heure sont requis.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    const res = await onUpdate(event.id, {
      title,
      description,
      invitedClientId: isOneToOneType(event.type) ? clientId || null : null,
      startsAt,
      durationMinutes: parseInt(duration) || 30,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
    } else {
      onClose();
    }
  }

  return (
    <div className="bg-[#150000] border border-[#890404]/25 rounded-xl p-4 space-y-3 mt-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">Modifier ce live</p>
        <button onClick={onClose} className="text-[#F5EDED]/30 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      {isOneToOneType(event.type) && (
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
          <option value="">Choisir un client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name ?? "Client"}</option>
          ))}
        </select>
      )}

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre / sujet" className={inputCls} />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="But / description (optionnel)"
        rows={2}
        className={`${inputCls} resize-none`}
      />

      <div className="grid grid-cols-3 gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
        <select value={duration} onChange={(e) => setDuration(e.target.value)} className={inputCls}>
          <option value="15">15 min</option>
          <option value="30">30 min</option>
          <option value="45">45 min</option>
          <option value="60">1h</option>
          <option value="90">1h30</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : "Enregistrer"}
        </button>
        <button onClick={onClose} className="text-xs text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors">
          Annuler
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
          <AlertCircle size={12} /> {error}
        </div>
      )}
    </div>
  );
}
