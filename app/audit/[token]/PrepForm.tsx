"use client";

import { useState } from "react";
import { PREP_QUESTIONS } from "@/lib/audit-prep";
import { saveAuditPrep } from "./actions";

export default function PrepForm({ token, initial }: { token: string; initial: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">(Object.keys(initial).length ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    const res = await saveAuditPrep(token, values);
    if ("error" in res) {
      setError(res.error);
      setState("error");
    } else setState("done");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {PREP_QUESTIONS.map((q) => (
        <label key={q.key} className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">{q.label}</span>
          <textarea
            value={values[q.key] ?? ""}
            onChange={(e) => {
              setValues((v) => ({ ...v, [q.key]: e.target.value }));
              if (state === "done") setState("idle");
            }}
            maxLength={q.max}
            rows={q.max > 400 ? 3 : 2}
            placeholder={q.placeholder}
            className="rounded-xl px-3 py-2.5 text-[16px] md:text-[14px]"
            style={{ background: "rgba(var(--ep-shade-rgb),0.35)", border: "1px solid rgba(var(--ep-ink-rgb),0.14)", color: "var(--ep-ink)" }}
          />
        </label>
      ))}
      <button
        type="submit"
        disabled={state === "saving"}
        className="h-12 rounded-full font-extrabold text-[14px]"
        style={{ background: state === "done" ? "var(--ep-ok)" : "var(--ep-accent)", color: "#fff", opacity: state === "saving" ? 0.6 : 1 }}
      >
        {state === "saving" ? "Envoi…" : state === "done" ? "C'est envoyé, merci" : "Envoyer à Emmanuel"}
      </button>
      {error && <p className="text-[13px]" style={{ color: "var(--ep-accent)" }}>{error}</p>}
      {state === "done" && <p className="text-[13px] opacity-75">Tu peux encore modifier tes réponses jusqu&apos;à l&apos;appel.</p>}
    </form>
  );
}
