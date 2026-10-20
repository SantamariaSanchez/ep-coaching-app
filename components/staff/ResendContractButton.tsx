"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { resendContractEmail } from "@/app/equipe/actions";
import { safeAction } from "@/lib/safe-action";

export default function ResendContractButton() {
  const t = useT();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {message && <span role="status" style={{ fontSize: 11.5, color: message.ok ? "var(--ep-ok)" : "var(--ep-pink)" }}>{message.text}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await safeAction(() => resendContractEmail());
            setMessage("error" in r ? { text: r.error, ok: false } : { text: "Copie envoyée par email.", ok: true });
          })
        }
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid rgba(var(--ep-accent-rgb),0.35)", borderRadius: 8, color: "var(--ep-ink)", fontSize: 11.5, fontWeight: 700, padding: "7px 12px", cursor: "pointer" }}
      >
        <Mail size={13} />
        {pending ? t("Envoi...") : t("Recevoir une copie par email")}
      </button>
    </div>
  );
}
