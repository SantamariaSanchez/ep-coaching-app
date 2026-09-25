"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { resendContractEmail } from "@/app/equipe/actions";

export default function ResendContractButton() {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {message && <span role="status" style={{ fontSize: 11.5, color: message.ok ? "#4ade80" : "#FDC4C4" }}>{message.text}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await resendContractEmail();
            setMessage("error" in r ? { text: r.error, ok: false } : { text: "Copie envoyée par email.", ok: true });
          })
        }
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid rgba(224,30,30,0.35)", borderRadius: 8, color: "#F5EDED", fontSize: 11.5, fontWeight: 700, padding: "7px 12px", cursor: "pointer" }}
      >
        <Mail size={13} />
        {pending ? "Envoi..." : "Recevoir une copie par email"}
      </button>
    </div>
  );
}
