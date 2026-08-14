"use client";

import { useState, useTransition } from "react";
import { Zap } from "lucide-react";
import { requestFlashCall } from "@/app/dashboard/client/live/actions";

export default function FlashRequestButton() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    setError("");
    startTransition(async () => {
      const result = await requestFlashCall(reason);
      if (result.error) setError(result.error);
      else {
        setSent(true);
        setReason("");
        setTimeout(() => { setOpen(false); setSent(false); }, 1800);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#E01E1E] mt-2"
      >
        <Zap size={13} />
        Demander un point flash (décision clé)
      </button>
    );
  }

  return (
    <div className="ep-card" style={{ padding: "16px 18px", marginTop: 10 }}>
      {sent ? (
        <p style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>Demande envoyée à ton coach !</p>
      ) : (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.4)", marginBottom: 8 }}>
            En 2 lignes, quelle décision dois-tu prendre ?
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Ex: je dois choisir entre deux offres avant demain..." aria-label="Ex: je dois choisir entre deux offres avant demain..."
            className="ep-input"
            style={{ resize: "none", marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSend} disabled={isPending} className="ep-btn-primary" style={{ fontSize: 11 }}>
              {isPending ? "..." : "Envoyer"}
            </button>
            <button onClick={() => setOpen(false)} className="ep-btn-secondary" style={{ fontSize: 11 }}>
              Annuler
            </button>
          </div>
          {error && <p style={{ color: "#ff6b6b", fontSize: 11, marginTop: 8 }}>{error}</p>}
        </>
      )}
    </div>
  );
}
