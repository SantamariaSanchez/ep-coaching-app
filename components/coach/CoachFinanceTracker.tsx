"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2, Download } from "lucide-react";
import { createFinanceEntry, deleteFinanceEntry } from "@/app/dashboard/coach/compta/actions";
import { categoriesFor } from "@/lib/coach-finance-categories";
import type { FinanceEntry } from "@/lib/coach-finance";

function eur(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// Axe 4 (VISION.md) : journal revenus/dépenses personnel du coach — un
// suivi rapide de SON activité, pas un logiciel de compta complet. Montants
// stockés en euros (même convention que lib/coach-billing.ts). Depuis le
// 2026-08-20 (Axe AY, MASTERCLASS.md), le premier paiement d'un client
// s'importe automatiquement depuis Stripe (voir lib/coach-finance-stripe-
// import.ts) — les lignes importées portent source="stripe" et un badge
// dédié, tout le reste (dépenses, renouvellements, coaching individuel...)
// reste déclaratif et saisi à la main.
export default function CoachFinanceTracker({ initialEntries }: { initialEntries: FinanceEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initialEntries change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<"revenu" | "depense">("revenu");
  const [category, setCategory] = useState<string>(categoriesFor("revenu")[0]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(todayStr());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentMonth = todayStr().slice(0, 7);
  const monthEntries = useMemo(() => entries.filter((e) => e.entry_date.startsWith(currentMonth)), [entries, currentMonth]);
  const monthRevenue = monthEntries.filter((e) => e.kind === "revenu").reduce((s, e) => s + e.amount, 0);
  const monthExpense = monthEntries.filter((e) => e.kind === "depense").reduce((s, e) => s + e.amount, 0);

  function changeKind(next: "revenu" | "depense") {
    setKind(next);
    setCategory(categoriesFor(next)[0]);
  }

  function submit() {
    setError(null);
    const amountNum = parseFloat(amount.replace(",", "."));
    if (!label.trim()) {
      setError("Libellé requis.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Montant invalide.");
      return;
    }
    startTransition(async () => {
      const result = await createFinanceEntry({ kind, category, label, amount: amountNum, entryDate, note: undefined });
      if (result.error) {
        setError(result.error);
        return;
      }
      setEntries((prev) => [
        {
          id: `tmp-${Date.now()}`,
          coach_id: "",
          entry_date: entryDate,
          kind,
          category,
          label: label.trim(),
          amount: amountNum,
          note: null,
          created_at: new Date().toISOString(),
          source: "manual",
        },
        ...prev,
      ]);
      setLabel("");
      setAmount("");
      setShowForm(false);
    });
  }

  // MASTERCLASS.md Axe B (rattrapé le 2026-08-19, même trou trouvé et
  // corrigé le même jour dans Studio créatif) : résultat jamais vérifié —
  // un échec serveur laissait l'écran afficher une entrée supprimée qui
  // existait toujours en base, sans retour en arrière.
  function remove(id: string) {
    const idx = entries.findIndex((e) => e.id === id);
    const backup = entries[idx];
    setEntries((prev) => prev.filter((e) => e.id !== id));
    startTransition(async () => {
      const result = await deleteFinanceEntry(id);
      if (result.error && backup) {
        setEntries((prev) => {
          const next = [...prev];
          next.splice(Math.min(idx, next.length), 0, backup);
          return next;
        });
        setError(result.error);
      }
    });
  }

  function exportCsv() {
    const header = ["Date", "Type", "Catégorie", "Libellé", "Montant"];
    const rows = entries.map((e) => [e.entry_date, e.kind, e.category, e.label, e.amount.toFixed(2)]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compta-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <SummaryCard label="Revenus (mois)" value={eur(monthRevenue)} color="#4ade80" Icon={TrendingUp} />
        <SummaryCard label="Dépenses (mois)" value={eur(monthExpense)} color="#f87171" Icon={TrendingDown} />
        <SummaryCard label="Solde (mois)" value={eur(monthRevenue - monthExpense)} color="#F5EDED" Icon={Wallet} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: "#E01E1E", color: "#fff",
            padding: "9px 16px", borderRadius: 999, fontWeight: 800, fontSize: 12.5, border: "none", cursor: "pointer",
          }}
        >
          <Plus size={14} /> Nouvelle ligne
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={entries.length === 0}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#E01E1E] disabled:opacity-30 transition-colors border border-[#890404]/25 rounded-lg px-3 py-2"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      {showForm && (
        <div className="ep-card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button type="button" onClick={() => changeKind("revenu")} style={toggleStyle(kind === "revenu", "#4ade80")}>
              Revenu
            </button>
            <button type="button" onClick={() => changeKind("depense")} style={toggleStyle(kind === "depense", "#f87171")}>
              Dépense
            </button>
          </div>

          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie" style={inputStyle}>
            {categoriesFor(kind).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Libellé (ex : Abonnement Canva)" aria-label="Libellé (ex : Abonnement Canva)"
            style={{ ...inputStyle, marginTop: 8 }}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant en €" aria-label="Montant en €"
              inputMode="decimal"
              style={inputStyle}
            />
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              aria-label="Date"
              style={inputStyle}
            />
          </div>

          {error && <p style={{ color: "#fb7185", fontSize: 12, marginTop: 8 }}>{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            style={{
              marginTop: 10, background: "#E01E1E", color: "#fff", padding: "9px 18px", borderRadius: "var(--radius-lg)",
              fontWeight: 800, fontSize: 12.5, border: "none", cursor: "pointer", opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "..." : "Ajouter"}
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <Wallet size={22} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Rien encore. Note tes revenus et dépenses au fil de l&apos;eau.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map((e) => (
            <div key={e.id} className="ep-card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              {e.kind === "revenu" ? (
                <TrendingUp size={14} style={{ color: "#4ade80", flexShrink: 0 }} />
              ) : (
                <TrendingDown size={14} style={{ color: "#f87171", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "#F5EDED", display: "flex", alignItems: "center", gap: 6 }}>
                  {e.label}
                  {e.source === "stripe" && (
                    <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "#635bff", background: "#635bff1f", border: "1px solid #635bff40", borderRadius: 999, padding: "1px 6px", flexShrink: 0 }}>
                      Stripe
                    </span>
                  )}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(245,237,237,0.35)" }}>
                  {e.category} · {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(e.entry_date + "T12:00:00"))}
                </p>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: e.kind === "revenu" ? "#4ade80" : "#f87171", flexShrink: 0 }}>
                {e.kind === "revenu" ? "+" : "-"}{eur(e.amount)}
              </span>
              <button
                type="button"
                onClick={() => remove(e.id)}
                aria-label="Supprimer"
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(245,237,237,0.25)", flexShrink: 0, padding: 4 }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, Icon }: { label: string; value: string; color: string; Icon: React.ElementType }) {
  return (
    <div className="ep-card" style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Icon size={12} style={{ color }} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)" }}>
          {label}
        </span>
      </div>
      <p style={{ fontSize: 16, fontWeight: 900, color, margin: 0 }}>{value}</p>
    </div>
  );
}

function toggleStyle(active: boolean, color: string): React.CSSProperties {
  return {
    flex: 1,
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
    border: active ? `1px solid ${color}` : "1px solid rgba(245,237,237,0.15)",
    background: active ? `${color}22` : "transparent",
    color: active ? color : "rgba(245,237,237,0.5)",
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(224,30,30,0.2)",
  borderRadius: "var(--radius-lg)",
  color: "#F5EDED",
  padding: "12px 16px",
  fontSize: 13,
  outline: "none",
};
