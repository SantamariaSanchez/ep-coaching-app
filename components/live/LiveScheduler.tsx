"use client";

import { useState } from "react";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { LIVE_TYPE_LABELS, type LiveType } from "@/lib/live-types";
import type { CreateLiveEventInput } from "@/app/dashboard/coach/live/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

export default function LiveScheduler({
  clients,
  onCreate,
}: {
  clients: { id: string; full_name: string | null }[];
  onCreate: (input: CreateLiveEventInput) => Promise<{ error?: string; id?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<LiveType>("webinaire");
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
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
    const res = await onCreate({
      title,
      description,
      type,
      invitedClientId: type === "1to1" ? clientId || null : null,
      startsAt,
      durationMinutes: parseInt(duration) || 30,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
    } else {
      setTitle("");
      setDescription("");
      setClientId("");
      setDate("");
      setTime("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors mb-5"
      >
        <Plus size={13} /> Programmer un live
      </button>
    );
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 space-y-3 mb-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">Programmer un live</p>

      <select value={type} onChange={(e) => setType(e.target.value as LiveType)} className={inputCls}>
        {Object.entries(LIVE_TYPE_LABELS).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>

      {type === "1to1" && (
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
          {submitting ? <Loader2 size={13} className="animate-spin" /> : "Programmer"}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors">
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
