"use client";

import { useState, useTransition } from "react";
import { resendStaffVerification } from "@/app/equipe/actions";

export default function ResendVerificationButton() {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="ep-btn-primary"
        style={{ height: 44, padding: "0 22px", fontSize: 12 }}
        onClick={() =>
          startTransition(async () => {
            const r = await resendStaffVerification();
            setMessage("error" in r ? { text: r.error, ok: false } : { text: "Email renvoyé.", ok: true });
          })
        }
      >
        {pending ? "Envoi..." : "Renvoyer l'email"}
      </button>
      {message && (
        <p role="status" style={{ fontSize: 12, marginTop: 10, color: message.ok ? "#4ade80" : "#FDC4C4" }}>
          {message.text}
        </p>
      )}
    </div>
  );
}
