"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Zap, Check, X } from "lucide-react";
import { scheduleFlashCall, declineFlashCall, type FlashRequest } from "@/app/dashboard/coach/live/actions";

export default function FlashRequestsPanel({ requests }: { requests: FlashRequest[] }) {
  const router = useRouter();
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (requests.length === 0) return null;

  function handleSchedule(requestId: string) {
    if (!date || !time) {
      setError("Choisis une date et une heure.");
      return;
    }
    setError("");
    startTransition(async () => {
      const startsAt = new Date(`${date}T${time}:00`).toISOString();
      const result = await scheduleFlashCall(requestId, startsAt);
      if (result.error) setError(result.error);
      else {
        setSchedulingId(null);
        router.refresh();
      }
    });
  }

  function handleDecline(requestId: string) {
    startTransition(async () => {
      await declineFlashCall(requestId);
      router.refresh();
    });
  }

  return (
    <div className="ep-card" style={{ padding: "16px 18px", marginBottom: 16 }}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3 flex items-center gap-1.5">
        <Zap size={12} style={{ color: "#E01E1E" }} />
        Demandes de point flash ({requests.length})
      </p>
      <div className="space-y-2.5">
        {requests.map((r) => (
          <div key={r.id} className="bg-black/20 border border-[#890404]/15 rounded-lg p-3">
            <p className="text-xs text-white font-bold">{r.client_name ?? "Client"}</p>
            <p className="text-xs text-[#F5EDED]/55 mt-1">{r.reason}</p>

            {schedulingId === r.id ? (
              <div className="mt-2.5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" className="ep-input" style={{ fontSize: 12 }} />
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Heure" className="ep-input" style={{ fontSize: 12 }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSchedule(r.id)} disabled={isPending} className="text-[11px] font-bold text-[#E01E1E]">
                    Confirmer
                  </button>
                  <button onClick={() => setSchedulingId(null)} className="text-[11px] font-bold text-[#F5EDED]/40">
                    Annuler
                  </button>
                </div>
                {error && <p className="text-red-400 text-[11px]">{error}</p>}
              </div>
            ) : (
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => { setSchedulingId(r.id); setError(""); }}
                  className="flex items-center gap-1 text-[11px] font-bold text-green-400"
                >
                  <Check size={12} /> Programmer
                </button>
                <button
                  onClick={() => handleDecline(r.id)}
                  disabled={isPending}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#F5EDED]/35 hover:text-red-400"
                >
                  <X size={12} /> Refuser
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
