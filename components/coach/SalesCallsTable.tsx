"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus } from "lucide-react";
import type { SalesCall } from "@/lib/sales-calls";
import { addSalesCall, updateSalesCall, deleteSalesCall } from "@/app/dashboard/coach/admin/ventes/actions";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso));
}

// Bouton à 3 états (inconnu / oui / non) pour show up et closing : un appel
// pas encore passé n'a ni oui ni non, distinct d'un "non" explicite. Cliquer
// fait tourner inconnu → oui → non → inconnu.
function TriState({ value, onChange, labelYes, labelNo }: { value: boolean | null; onChange: (v: boolean | null) => void; labelYes: string; labelNo: string }) {
  const next = value === null ? true : value === true ? false : null;
  const text = value === null ? "—" : value ? labelYes : labelNo;
  const color = value === null ? "rgba(245,237,237,0.35)" : value ? "#4ade80" : "#f87171";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      style={{
        fontSize: 11,
        fontWeight: 700,
        color,
        background: "rgba(245,237,237,0.04)",
        border: "1px solid rgba(245,237,237,0.1)",
        borderRadius: 6,
        padding: "4px 10px",
        cursor: "pointer",
        minWidth: 48,
      }}
    >
      {text}
    </button>
  );
}

function CallRow({ call }: { call: SalesCall }) {
  const [isPending, startTransition] = useTransition();
  const [revenue, setRevenue] = useState(call.revenue_amount != null ? String(call.revenue_amount) : "");

  function patch(p: Partial<{ show_up: boolean | null; closed: boolean | null; revenue_amount: number | null }>) {
    startTransition(async () => {
      await updateSalesCall(call.id, p);
    });
  }

  return (
    <div className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3.5 flex-wrap" style={{ opacity: isPending ? 0.6 : 1 }}>
      <div className="flex-1 min-w-[140px]">
        <p className="text-sm font-bold text-white truncate">{call.lead_name}</p>
        <span className="text-[10px] text-[#F5EDED]/35">{formatDate(call.call_date)}</span>
      </div>
      <TriState value={call.show_up} onChange={(v) => patch({ show_up: v })} labelYes="Venu" labelNo="Absent" />
      <TriState value={call.closed} onChange={(v) => patch({ closed: v })} labelYes="Signé" labelNo="Perdu" />
      <input
        type="number"
        inputMode="decimal"
        placeholder="CA €"
        value={revenue}
        onChange={(e) => setRevenue(e.target.value)}
        onBlur={() => patch({ revenue_amount: revenue.trim() ? Number(revenue) : null })}
        className="ep-input"
        style={{ width: 80, padding: "6px 8px", fontSize: 12 }}
      />
      <button
        type="button"
        onClick={() => startTransition(async () => { await deleteSalesCall(call.id); })}
        style={{ color: "rgba(245,237,237,0.25)", background: "none", border: "none", cursor: "pointer", padding: 4 }}
        aria-label="Supprimer"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function SalesCallsTable({ calls }: { calls: SalesCall[] }) {
  const [leadName, setLeadName] = useState("");
  const [callDate, setCallDate] = useState(todayStr());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!leadName.trim()) return;
    startTransition(async () => {
      const result = await addSalesCall({ leadName, callDate });
      if (result.error) {
        setError(result.error);
      } else {
        setLeadName("");
        setCallDate(todayStr());
        setError(null);
      }
    });
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="flex items-center gap-2 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Nom du lead"
          value={leadName}
          onChange={(e) => setLeadName(e.target.value)}
          className="ep-input"
          style={{ flex: 1, minWidth: 140 }}
        />
        <input
          type="date"
          value={callDate}
          onChange={(e) => setCallDate(e.target.value)}
          className="ep-input"
          style={{ width: 140 }}
        />
        <button type="submit" disabled={isPending} className="ep-btn-primary" style={{ height: 40, padding: "0 16px", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Ajouter
        </button>
      </form>
      {error && <p style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>{error}</p>}

      <div className="space-y-2">
        {calls.map((c) => (
          <CallRow key={c.id} call={c} />
        ))}
      </div>
    </div>
  );
}
