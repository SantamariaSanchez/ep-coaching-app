"use client";

import { useState } from "react";
import { Plus, Loader2, AlertCircle, X } from "lucide-react";
import { LIVE_TYPE_LABELS, LIVE_TYPE_INFO, isOneToOneType, type LiveType } from "@/lib/live-types";
import { LIVE_TYPE_ICONS } from "@/components/live/live-icons";
import type { CreateLiveEventInput } from "@/app/dashboard/coach/live/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

const TYPE_ORDER: LiveType[] = [
  "1to1", "audit", "checkin_hebdo", "acces_direct", "atelier", "webinaire", "qna",
];

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
  const [guestName, setGuestName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openWithType(t: LiveType) {
    setType(t);
    setDuration(String(LIVE_TYPE_INFO[t].defaultDuration));
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
    setError(null);
  }

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
      invitedClientId: isOneToOneType(type) ? clientId || null : null,
      guestName: type === "atelier" ? guestName.trim() || null : null,
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
      setGuestName("");
      setDate("");
      setTime("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Programmer un live
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {TYPE_ORDER.map((t) => {
            const Icon = LIVE_TYPE_ICONS[t];
            const info = LIVE_TYPE_INFO[t];
            return (
              <button
                key={t}
                onClick={() => openWithType(t)}
                className="ep-card"
                style={{
                  padding: "14px 12px",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: "rgba(224,30,30,0.1)", border: "1px solid rgba(224,30,30,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={15} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#F5EDED" }}>
                    {LIVE_TYPE_LABELS[t]}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(245,237,237,0.4)", lineHeight: 1.4 }}>
                    {info.tagline}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 9.5, fontWeight: 700, color: "rgba(224,30,30,0.55)", lineHeight: 1.4, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    {info.cadence}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 space-y-3 mb-6">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
          Programmer : {LIVE_TYPE_LABELS[type]}
        </p>
        <button onClick={closeForm} className="text-[#F5EDED]/30 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.45)", lineHeight: 1.6 }}>
        {LIVE_TYPE_INFO[type].coachDescription}
      </p>

      <select value={type} onChange={(e) => setType(e.target.value as LiveType)} className={inputCls}>
        {Object.entries(LIVE_TYPE_LABELS).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>

      {isOneToOneType(type) && (
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
          <option value="">Choisir un client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name ?? "Client"}</option>
          ))}
        </select>
      )}

      {type === "atelier" && (
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Intervenant invité (optionnel)"
          className={inputCls}
        />
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
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <><Plus size={13} /> Programmer</>}
        </button>
        <button onClick={closeForm} className="text-xs text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors">
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
