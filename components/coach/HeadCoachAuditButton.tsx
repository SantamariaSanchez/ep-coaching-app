"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { triggerHeadCoachAudit } from "@/app/dashboard/coach/admin/organisation/agents/actions";

// Rend réelle la mission déclarée de Valentina (Head Coach, lib/ai-agents.ts :
// "Audit de qualité sur un échantillon de bilans/programmes") — voir
// lib/head-coach-audit.ts. Un clic scanne les vrais clients et crée une
// vraie tâche par problème concret, visible juste en dessous dans la
// liste de tâches déjà existante de cette page.
export default function HeadCoachAuditButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await triggerHeadCoachAudit();
      if (res.error) setResult(res.error);
      else if (res.created === 0) setResult(`${res.scanned} client${res.scanned !== 1 ? "s" : ""} passé${res.scanned !== 1 ? "s" : ""} en revue, rien à signaler.`);
      else setResult(`${res.created} tâche${res.created !== 1 ? "s" : ""} créée${res.created !== 1 ? "s" : ""} sur ${res.scanned} client${res.scanned !== 1 ? "s" : ""} passé${res.scanned !== 1 ? "s" : ""} en revue.`);
    });
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-lg border transition-colors disabled:opacity-50"
        style={{ background: "rgba(96,165,250,0.1)", borderColor: "rgba(96,165,250,0.3)", color: "#60a5fa" }}
      >
        <ShieldCheck size={13} />
        {isPending ? "Audit en cours…" : "Lancer l'audit qualité"}
      </button>
      {result && <p className="text-[11px] text-[#F5EDED]/40 mt-2">{result}</p>}
    </div>
  );
}
