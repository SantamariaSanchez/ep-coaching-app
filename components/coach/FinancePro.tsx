"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Target, Upload, Repeat, PiggyBank, Settings2, Check, X, CalendarRange } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { safeAction } from "@/lib/safe-action";
import { categoriesFor } from "@/lib/coach-finance-categories";
import type { FinanceEntry, FinanceSettings } from "@/lib/coach-finance";
import {
  parseBankCsv,
  toImportCandidates,
  monthProjection,
  detectSubscriptions,
  contributionsToSetAside,
  yearTotals,
  type ImportCandidate,
} from "@/lib/finance-pro";
import { importFinanceEntries, saveFinanceSettings } from "@/app/dashboard/coach/compta/actions";

function eur(n: number, digits = 0): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + " €";
}

function numOrNull(v: string): number | null {
  const n = parseFloat(v.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Revenus & dépenses, version complète (25/11) : ce que Stripe, Boursorama
// ou GoCardless ne donnent pas à un coach : combien il manque pour l'objectif
// du mois, en nombre de clients ; combien mettre de côté ; ce que coûtent les
// abonnements ; et l'import du relevé de banque en deux clics.
export default function FinancePro({
  entries,
  month,
  today,
  settings,
}: {
  entries: FinanceEntry[];
  month: string;
  today: string;
  settings: FinanceSettings;
}) {
  const t = useT();
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [editing, setEditing] = useState(false);
  const [goalIn, setGoalIn] = useState(settings.monthly_goal?.toString() ?? "");
  const [rateIn, setRateIn] = useState(settings.contribution_rate?.toString() ?? "");
  const [priceIn, setPriceIn] = useState(settings.offer_price?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const p = useMemo(() => monthProjection(entries, month, today, s.monthly_goal, s.offer_price), [entries, month, today, s]);
  const subs = useMemo(() => detectSubscriptions(entries, month), [entries, month]);
  const aside = contributionsToSetAside(p.revenue, s.contribution_rate);
  const year = month.slice(0, 4);
  const yt = useMemo(() => yearTotals(entries, year), [entries, year]);
  const yearAside = contributionsToSetAside(yt.revenue, s.contribution_rate);
  const isCurrent = today.startsWith(month);

  function saveSettings() {
    setError(null);
    const next = { monthlyGoal: numOrNull(goalIn), contributionRate: numOrNull(rateIn), offerPrice: numOrNull(priceIn) };
    startTransition(async () => {
      const r = await safeAction(() => saveFinanceSettings(next));
      if (r.error) { setError(r.error); return; }
      setS({ monthly_goal: next.monthlyGoal, contribution_rate: next.contributionRate, offer_price: next.offerPrice });
      setEditing(false);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
      {/* Objectif du mois */}
      <div className="ep-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={cardTitle}><Target size={13} style={{ color: "var(--ep-accent)" }} />{t("Objectif du mois")}</p>
          <button type="button" onClick={() => setEditing((v) => !v)} aria-label={t("Réglages")} style={iconBtn}><Settings2 size={15} /></button>
        </div>

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Field label={t("Objectif de revenus par mois (€)")} value={goalIn} onChange={setGoalIn} placeholder="3000" />
            <Field label={t("Prix de ton offre principale (€)")} value={priceIn} onChange={setPriceIn} placeholder="150" />
            <Field label={t("Part à mettre de côté pour tes cotisations et impôts (%)")} value={rateIn} onChange={setRateIn} placeholder="25" />
            <p style={hint}>{t("Le taux dépend de ton statut : reprends celui de ton dernier avis ou de ton comptable.")}</p>
            {error && <p style={{ color: "var(--ep-bad)", fontSize: 12, margin: 0 }}>{t(error)}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={saveSettings} disabled={isPending} style={primaryBtn}>{isPending ? "..." : t("Enregistrer")}</button>
              <button type="button" onClick={() => setEditing(false)} style={ghostBtn}>{t("Annuler")}</button>
            </div>
          </div>
        ) : p.goal === null ? (
          <button type="button" onClick={() => setEditing(true)} style={{ ...ghostBtn, width: "100%" }}>
            {t("Fixe ton objectif du mois pour voir combien il te manque")}
          </button>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: "var(--ep-ink)", fontVariantNumeric: "tabular-nums" }}>{eur(p.revenue)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.5)" }}>/ {eur(p.goal)}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "rgba(var(--ep-ink-rgb),0.07)", overflow: "hidden", margin: "8px 0 10px" }}>
              <div style={{ width: `${(p.progress ?? 0) * 100}%`, height: "100%", background: (p.progress ?? 0) >= 1 ? "var(--ep-ok)" : "var(--ep-accent)", borderRadius: 999, transition: "width .4s ease" }} />
            </div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--ep-ink)" }}>
              {p.missing === 0
                ? t("Objectif atteint. Tout ce qui rentre maintenant, c'est du bonus.")
                : p.clientsNeeded
                  ? `${t("Il te manque")} ${eur(p.missing ?? 0)}, ${t("soit")} ${p.clientsNeeded} ${p.clientsNeeded > 1 ? t("clients") : t("client")} ${t("à")} ${eur(s.offer_price ?? 0)}.`
                  : `${t("Il te manque")} ${eur(p.missing ?? 0)}.`}
            </p>
            {isCurrent && p.projected !== null && (
              <p style={{ ...hint, marginTop: 4 }}>
                {t("À ce rythme, tu finis le mois à")} {eur(p.projected)} · {p.daysLeft} {p.daysLeft > 1 ? t("jours restants") : t("jour restant")}
              </p>
            )}
          </>
        )}
      </div>

      {/* À mettre de côté + année */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="ep-card" style={{ padding: "12px 14px" }}>
          <p style={miniTitle}><PiggyBank size={12} style={{ color: "var(--ep-accent)" }} />{t("À mettre de côté")}</p>
          {aside === null ? (
            <button type="button" onClick={() => setEditing(true)} style={linkBtn}>{t("Renseigne ton taux")}</button>
          ) : (
            <>
              <p style={bigNum}>{eur(aside)}</p>
              <p style={hint}>{t("ce mois")} · {eur(yearAside ?? 0)} {t("depuis janvier")}</p>
            </>
          )}
        </div>
        <div className="ep-card" style={{ padding: "12px 14px" }}>
          <p style={miniTitle}><CalendarRange size={12} style={{ color: "var(--ep-accent)" }} />{t("Année")} {year}</p>
          <p style={{ ...bigNum, color: yt.net >= 0 ? "var(--ep-ink)" : "var(--ep-bad)" }}>{eur(yt.net)}</p>
          <p style={hint}>+{eur(yt.revenue)} · -{eur(yt.expense)}</p>
        </div>
      </div>

      {/* Abonnements */}
      {subs.items.length > 0 && (
        <div className="ep-card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <p style={cardTitle}><Repeat size={13} style={{ color: "var(--ep-accent)" }} />{t("Tes abonnements")}</p>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ep-bad)", fontVariantNumeric: "tabular-nums" }}>{eur(subs.monthly, 2)} / {t("mois")}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {subs.items.map((it) => (
              <div key={it.label} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                <span style={{ color: "var(--ep-ink)", fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
                <span style={{ color: "rgba(var(--ep-ink-rgb),0.6)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{eur(it.amount, 2)} · {eur(it.amount * 12)} / {t("an")}</span>
              </div>
            ))}
          </div>
          <p style={{ ...hint, marginTop: 8 }}>{t("Repérés car ils reviennent au moins 2 mois sur 3. Un que tu n'utilises plus ? C'est de l'argent à récupérer.")}</p>
        </div>
      )}

      <BankImport entries={entries} onDone={() => router.refresh()} />
    </div>
  );
}

function BankImport({ entries, onDone }: { entries: FinanceEntry[]; onDone: () => void }) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<(ImportCandidate & { keep: boolean })[] | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onFile(file: File) {
    setError(null);
    setInfo(null);
    const buf = await file.arrayBuffer();
    // Beaucoup de banques françaises exportent encore en Windows-1252.
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buf);
    const parsed = parseBankCsv(text);
    if (parsed.error) { setError(parsed.error); setRows(null); return; }
    const c = toImportCandidates(parsed.rows, entries);
    setRows(c.map((x) => ({ ...x, keep: !x.duplicate })));
    if (parsed.skipped) setInfo(`${parsed.skipped} ${t("ligne(s) illisible(s) ignorée(s)")}`);
  }

  function doImport() {
    if (!rows) return;
    const chosen = rows.filter((r) => r.keep);
    if (chosen.length === 0) { setError("Aucune ligne cochée."); return; }
    startTransition(async () => {
      const r = await safeAction(() =>
        importFinanceEntries(chosen.map((x) => ({ kind: x.kind, category: x.category, label: x.label, amount: x.amount, entryDate: x.entry_date })))
      );
      if (r.error) { setError(r.error); return; }
      setRows(null);
      setInfo(`${r.inserted ?? chosen.length} ${t("lignes importées")}`);
      if (fileRef.current) fileRef.current.value = "";
      onDone();
    });
  }

  const kept = rows?.filter((r) => r.keep) ?? [];
  const keptIn = kept.filter((r) => r.kind === "revenu").reduce((s, r) => s + r.amount, 0);
  const keptOut = kept.filter((r) => r.kind === "depense").reduce((s, r) => s + r.amount, 0);

  return (
    <div className="ep-card" style={{ padding: 14 }}>
      <p style={cardTitle}><Upload size={13} style={{ color: "var(--ep-accent)" }} />{t("Importer ton relevé de banque")}</p>
      <p style={{ ...hint, margin: "4px 0 10px" }}>{t("Export CSV de ta banque (Boursorama, Qonto, Shine, Revolut…). Tout est classé tout seul, tu corriges avant de valider. Les doublons sont décochés.")}</p>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        aria-label={t("Fichier CSV")}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
        style={{ fontSize: 12, color: "var(--ep-ink)" }}
      />
      {error && <p style={{ color: "var(--ep-bad)", fontSize: 12, margin: "8px 0 0" }}>{t(error)}</p>}
      {info && <p style={{ ...hint, marginTop: 8 }}>{info}</p>}

      {rows && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, margin: "12px 0 8px", fontSize: 12, fontWeight: 800 }}>
            <span style={{ color: "var(--ep-ink)" }}>{kept.length} / {rows.length} {t("lignes")}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              <span style={{ color: "var(--ep-ok)" }}>+{eur(keptIn, 2)}</span> · <span style={{ color: "var(--ep-bad)" }}>-{eur(keptOut, 2)}</span>
            </span>
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderBottom: "1px solid rgba(var(--ep-line-rgb),0.15)", opacity: r.keep ? 1 : 0.45 }}>
                <button
                  type="button"
                  aria-label={r.keep ? t("Ne pas importer") : t("Importer")}
                  onClick={() => setRows((prev) => prev && prev.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))}
                  style={{ ...iconBtn, width: 26, height: 26, color: r.keep ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.4)" }}
                >
                  {r.keep ? <Check size={14} /> : <X size={14} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--ep-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.label}{r.duplicate && <span style={{ color: "var(--ep-bad)", fontWeight: 800 }}> · {t("déjà là")}</span>}
                  </p>
                  <select
                    value={r.category}
                    aria-label={t("Catégorie")}
                    onChange={(e) => { const v = e.target.value; setRows((prev) => prev && prev.map((x, j) => (j === i ? { ...x, category: v } : x))); }}
                    style={{ fontSize: 11, background: "transparent", border: "none", color: "rgba(var(--ep-ink-rgb),0.55)", padding: 0, maxWidth: "100%" }}
                  >
                    {categoriesFor(r.kind).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <span style={{ fontSize: 10.5, color: "rgba(var(--ep-ink-rgb),0.4)", flexShrink: 0 }}>{r.entry_date.slice(8, 10)}/{r.entry_date.slice(5, 7)}</span>
                <span style={{ fontSize: 12, fontWeight: 800, flexShrink: 0, fontVariantNumeric: "tabular-nums", color: r.kind === "revenu" ? "var(--ep-ok)" : "var(--ep-bad)" }}>
                  {r.kind === "revenu" ? "+" : "-"}{eur(r.amount, 2)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" onClick={doImport} disabled={isPending || kept.length === 0} style={primaryBtn}>
              {isPending ? "..." : `${t("Importer")} ${kept.length} ${t("lignes")}`}
            </button>
            <button type="button" onClick={() => { setRows(null); if (fileRef.current) fileRef.current.value = ""; }} style={ghostBtn}>{t("Annuler")}</button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.6)" }}>
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode="decimal" style={input} />
    </label>
  );
}

const cardTitle: React.CSSProperties = { margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ep-ink)" };
const miniTitle: React.CSSProperties = { margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.45)" };
const bigNum: React.CSSProperties = { margin: 0, fontSize: 17, fontWeight: 900, color: "var(--ep-ink)", fontVariantNumeric: "tabular-nums" };
const hint: React.CSSProperties = { margin: 0, fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.5)", lineHeight: 1.45 };
const iconBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(var(--ep-ink-rgb),0.04)", border: "1px solid rgba(var(--ep-line-rgb),0.25)", color: "var(--ep-ink)", cursor: "pointer", flexShrink: 0 };
const primaryBtn: React.CSSProperties = { background: "var(--ep-accent)", color: "#fff", padding: "10px 16px", borderRadius: 999, fontWeight: 800, fontSize: 12.5, border: "none", cursor: "pointer", minHeight: 40 };
const ghostBtn: React.CSSProperties = { background: "transparent", color: "var(--ep-ink)", padding: "10px 16px", borderRadius: 999, fontWeight: 700, fontSize: 12.5, border: "1px dashed rgba(var(--ep-accent-rgb),0.45)", cursor: "pointer", minHeight: 40 };
const linkBtn: React.CSSProperties = { background: "none", border: "none", padding: 0, color: "var(--ep-accent)", fontSize: 12, fontWeight: 800, cursor: "pointer" };
const input: React.CSSProperties = { width: "100%", background: "rgba(var(--ep-shade-rgb),0.4)", border: "1px solid rgba(var(--ep-accent-rgb),0.2)", borderRadius: "var(--radius-lg)", color: "var(--ep-ink)", padding: "10px 14px", fontSize: 13, outline: "none" };
