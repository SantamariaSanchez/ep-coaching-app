"use client";

import { useState, useTransition } from "react";
import { Clock3, CheckCircle2 } from "lucide-react";
import { joinWaitlist } from "@/app/dashboard/client/abonnement/actions";

// Item 45 : le coach est à capacité — remplace le CTA de réservation par
// une inscription à sa liste d'attente.
export default function WaitlistJoinButton({ alreadyOnWaitlist }: { alreadyOnWaitlist: boolean }) {
  const [joined, setJoined] = useState(alreadyOnWaitlist);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await joinWaitlist(note);
      if (result.error) {
        setError(result.error);
        return;
      }
      setJoined(true);
    });
  }

  if (joined) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
        color: "#4ade80", fontSize: 13, fontWeight: 700,
      }}>
        <CheckCircle2 size={16} /> Tu es sur la liste d&apos;attente, le coach te contactera.
      </div>
    );
  }

  return (
    <div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Un mot sur ta situation (facultatif)"
        style={{
          width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(224,30,30,0.2)",
          borderRadius: "var(--radius-lg)", color: "#F5EDED", padding: "12px 16px", fontSize: 13,
          marginBottom: 12, outline: "none",
        }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#E01E1E", color: "#fff", padding: "14px 28px", borderRadius: "var(--radius-lg)",
          fontWeight: 800, fontSize: 14, letterSpacing: "0.02em", border: "none", cursor: "pointer",
          opacity: isPending ? 0.6 : 1,
        }}
      >
        <Clock3 size={16} />
        {isPending ? "..." : "Rejoindre la liste d'attente"}
      </button>
      {error && <p style={{ color: "#fb7185", fontSize: 12, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
