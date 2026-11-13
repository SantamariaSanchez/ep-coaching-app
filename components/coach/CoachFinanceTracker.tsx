"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useMemo, useState, useTransition, useEffect } from "react";
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2, Download, ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { monthTotals, monthSeries, categoryBreakdown, recurringToCarry, shiftMonth } from "@/lib/coach-finance-insights";
import { createFinanceEntry, deleteFinanceEntry } from "@/app/dashboard/coach/compta/actions";
import { categoriesFor } from "@/lib/coach-finance-categories";
import type { FinanceEntry } from "@/lib/coach-finance";
import { withAlpha } from "@/lib/theme-color";
import { safeAction } from "@/lib/safe-action";

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
  const t = useT();
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
  const [month, setMonth] = useState(currentMonth);
  const [filter, setFilter] = useState<"tout" | "revenu" | "depense">("tout");
  const totals = useMemo(() => monthTotals(entries, month), [entries, month]);
  const monthRevenue = totals.revenue;
  const monthExpense = totals.expense;
  const series = useMemo(() => monthSeries(entries, month, 6), [entries, month]);
  const maxBar = Math.max(1, ...series.flatMap((x) => [x.revenue, x.expense]));
  const expenseCats = useMemo(() => categoryBreakdown(entries, month, "depense"), [entries, month]);
  const toCarry = useMemo(() => recurringToCarry(entries, month), [entries, month]);
  const visible = useMemo(
    () => entries.filter((e) => e.entry_date.startsWith(month) && (filter === "tout" || e.kind === filter)),
    [entries, month, filter]
  );
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${month}-15T12:00:00`));

  function carryRecurring() {
    const items = toCarry;
    startTransition(async () => {
      for (const it of items) {
        const r = await safeAction(() => createFinanceEntry({ kind: "depense", category: it.category, label: it.label, amount: it.amount, entryDate: it.entry_date, note: undefined }));
        if (r.error) { setError(r.error); return; }
        setEntries((prev) => [{ id: `tmp-${Date.now()}-${it.label}`, coach_id: "", entry_date: it.entry_date, kind: "depense", category: it.category, label: it.label, amount: it.amount, note: null, created_at: new Date().toISOString(), source: "manual" }, ...prev]);
      }
    });
  }

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
      const result = await safeAction(() => createFinanceEntry({ kind, category, label, amount: amountNum, entryDate, note: undefined }));
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
      const result = await safeAction(() => deleteFinanceEntry(id));
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
      {/* Mois affiché */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button type="button" aria-label={t("Mois précédent")} onClick={() => setMonth((m) => shiftMonth(m, -1))} style={navBtn}><ChevronLeft size={18} /></button>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 900, textTransform: "capitalize", color: "var(--ep-ink)" }}>{monthLabel}</p>
        <button type="button" aria-label={t("Mois suivant")} disabled={month >= currentMonth} onClick={() => setMonth((m) => shiftMonth(m, 1))} style={{ ...navBtn, opacity: month >= currentMonth ? 0.3 : 1 }}><ChevronRight size={18} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        <SummaryCard label={t("Revenus")} value={eur(monthRevenue)} color="var(--ep-ok)" Icon={TrendingUp} />
        <SummaryCard label={t("Dépenses")} value={eur(monthExpense)} color="var(--ep-bad)" Icon={TrendingDown} />
        <SummaryCard label={t("Bénéfice")} value={eur(monthRevenue - monthExpense)} color={monthRevenue - monthExpense >= 0 ? "var(--ep-ink)" : "var(--ep-bad)"} Icon={Wallet} />
      </div>

      {/* 6 derniers mois : revenus (vert) et dépenses (rouge) */}
      <div className="ep-card" style={{ padding: "14px 14px 10px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110 }}>
          {series.map((x) => (
            <button key={x.month} type="button" onClick={() => setMonth(x.month)} aria-label={x.month} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 86, width: "100%", justifyContent: "center" }}>
                <div style={{ width: "38%", maxWidth: 16, height: `${(x.revenue / maxBar) * 100}%`, minHeight: x.revenue ? 3 : 0, background: "var(--ep-ok)", borderRadius: 4 }} />
                <div style={{ width: "38%", maxWidth: 16, height: `${(x.expense / maxBar) * 100}%`, minHeight: x.expense ? 3 : 0, background: "var(--ep-bad)", borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: x.month === month ? 900 : 600, color: x.month === month ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.45)" }}>
                {new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(`${x.month}-15T12:00:00`))}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Où part l'argent ce mois-ci */}
      {expenseCats.length > 0 && (
        <div className="ep-card" style={{ padding: 14, marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {expenseCats.map((c) => (
            <div key={c.category}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                <span style={{ color: "var(--ep-ink)" }}>{c.category}</span>
                <span style={{ color: "rgba(var(--ep-ink-rgb),0.6)", fontVariantNumeric: "tabular-nums" }}>{eur(c.amount)} · {Math.round(c.share * 100)} %</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "rgba(var(--ep-ink-rgb),0.07)", overflow: "hidden" }}>
                <div style={{ width: `${c.share * 100}%`, height: "100%", background: "var(--ep-bad)", borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {toCarry.length > 0 && (
        <button
          type="button"
          onClick={carryRecurring}
          disabled={isPending}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, marginBottom: 14, borderRadius: 12, border: "1px dashed rgba(var(--ep-accent-rgb),0.45)", background: "rgba(var(--ep-accent-rgb),0.06)", color: "var(--ep-ink)", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
        >
          <Repeat size={15} style={{ color: "var(--ep-accent)" }} />
          {t("Reporter les dépenses fixes")} ({toCarry.length} · {eur(toCarry.reduce((s, x) => s + x.amount, 0))})
        </button>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["tout", "revenu", "depense"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} style={{ fontSize: 12, fontWeight: 800, padding: "7px 12px", borderRadius: 999, cursor: "pointer", border: filter === f ? "1px solid var(--ep-accent)" : "1px solid rgba(var(--ep-ink-rgb),0.12)", background: filter === f ? "rgba(var(--ep-accent-rgb),0.16)" : "transparent", color: filter === f ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.55)" }}>
            {f === "tout" ? t("Tout") : f === "revenu" ? t("Revenus") : t("Dépenses")}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: "var(--ep-accent)", color: "#fff",
            padding: "9px 16px", borderRadius: 999, fontWeight: 800, fontSize: 12.5, border: "none", cursor: "pointer",
          }}
        >
          <Plus size={14} />{" "}{t("Nouvelle ligne")}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={entries.length === 0}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-accent) disabled:opacity-30 transition-colors border border-(--ep-line)/25 rounded-lg px-3 py-2"
        >
          <Download size={12} />{" "}{t("Export CSV")}
        </button>
      </div>

      {showForm && (
        <div className="ep-card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button type="button" onClick={() => changeKind("revenu")} style={toggleStyle(kind === "revenu", "var(--ep-ok)")}>
              {t("Revenu")}
            </button>
            <button type="button" onClick={() => changeKind("depense")} style={toggleStyle(kind === "depense", "var(--ep-bad)")}>
              {t("Dépense")}
            </button>
          </div>

          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t("Catégorie")} style={inputStyle}>
            {categoriesFor(kind).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("Libellé (ex : Abonnement Canva)")} aria-label={t("Libellé (ex : Abonnement Canva)")}
            style={{ ...inputStyle, marginTop: 8 }}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("Montant en €")} aria-label={t("Montant en €")}
              inputMode="decimal"
              style={inputStyle}
            />
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              aria-label={t("Date")}
              style={inputStyle}
            />
          </div>

          {error && <p style={{ color: "#fb7185", fontSize: 12, marginTop: 8 }}>{t(error)}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            style={{
              marginTop: 10, background: "var(--ep-accent)", color: "#fff", padding: "9px 18px", borderRadius: "var(--radius-lg)",
              fontWeight: 800, fontSize: 12.5, border: "none", cursor: "pointer", opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "..." : t("Ajouter")}
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="bg-(--ep-s1) border border-dashed border-(--ep-line)/25 rounded-xl py-16 text-center">
          <Wallet size={22} className="text-(--ep-ink)/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-(--ep-ink)/35">{t("Rien ce mois-ci.")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {visible.map((e) => (
            <div key={e.id} className="ep-card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              {e.kind === "revenu" ? (
                <TrendingUp size={14} style={{ color: "var(--ep-ok)", flexShrink: 0 }} />
              ) : (
                <TrendingDown size={14} style={{ color: "var(--ep-bad)", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--ep-ink)", display: "flex", alignItems: "center", gap: 6 }}>
                  {e.label}
                  {e.source === "stripe" && (
                    <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "#635bff", background: "#635bff1f", border: "1px solid #635bff40", borderRadius: 999, padding: "1px 6px", flexShrink: 0 }}>
                      {t("Stripe")}
                    </span>
                  )}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(var(--ep-ink-rgb),0.35)" }}>
                  {e.category} · {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(e.entry_date + "T12:00:00"))}
                </p>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: e.kind === "revenu" ? "var(--ep-ok)" : "var(--ep-bad)", flexShrink: 0 }}>
                {e.kind === "revenu" ? "+" : "-"}{eur(e.amount)}
              </span>
              <button
                type="button"
                onClick={() => remove(e.id)}
                aria-label={t("Supprimer")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(var(--ep-ink-rgb),0.25)", flexShrink: 0, padding: 4 }}
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
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.4)" }}>
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
    border: active ? `1px solid ${color}` : "1px solid rgba(var(--ep-ink-rgb),0.15)",
    background: active ? `${withAlpha(color, "22")}` : "transparent",
    color: active ? color : "rgba(var(--ep-ink-rgb),0.5)",
  };
}

const navBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(var(--ep-ink-rgb),0.04)", border: "1px solid rgba(var(--ep-line-rgb),0.25)", color: "var(--ep-ink)", cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(var(--ep-shade-rgb),0.4)",
  border: "1px solid rgba(var(--ep-accent-rgb),0.2)",
  borderRadius: "var(--radius-lg)",
  color: "var(--ep-ink)",
  padding: "12px 16px",
  fontSize: 13,
  outline: "none",
};
