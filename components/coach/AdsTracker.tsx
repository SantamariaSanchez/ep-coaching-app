"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Plus, Trash2, Megaphone, Download, AlertTriangle, Pencil, StickyNote, ChevronDown,
} from "lucide-react";
import {
  createAdCampaign, updateAdCampaign, deleteAdCampaign,
} from "@/app/dashboard/coach/business/ads/actions";
import {
  AD_PLATFORMS, AD_OBJECTIVES, AD_STATUSES, PLATFORM_LABELS, OBJECTIVE_LABELS, STATUS_LABELS,
  computeCampaignMetrics, aggregateCampaignTotals, isStagnant, daysSinceStart,
  ctrSeverity, costPerLeadSeverity, roasSeverity,
  type AdCampaign, type AdStatus, type MetricSeverity,
} from "@/lib/ad-campaigns";

// Outil de pilotage MANUEL de la pub payante (Google/Meta/TikTok...) — pas
// d'intégration API régie. Le coach saisit/copie ses chiffres depuis les
// régies, ce composant calcule et affiche ce qui sert à décider quoi
// couper ou scaler. Voir lib/ad-campaigns.ts pour tous les calculs (purs,
// testables) et la migration 20260916a_ad_campaigns.sql pour le schéma.

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function eur(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
}

function int(n: number): string {
  return n.toLocaleString("fr-FR");
}

function pct(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + " %";
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const SEVERITY_COLOR: Record<MetricSeverity, string> = {
  good: "#4ade80",
  neutral: "#F5EDED",
  bad: "#f87171",
  unknown: "rgba(245,237,237,0.3)",
};

type SortKey = "recent" | "spend_desc" | "cpl_asc" | "cpl_desc" | "ctr_desc";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Récentes",
  spend_desc: "Dépense (haute → basse)",
  cpl_asc: "Coût / lead (bas → haut)",
  cpl_desc: "Coût / lead (haut → bas)",
  ctr_desc: "CTR (haut → bas)",
};

function MetricTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ minWidth: 74 }}>
      <p style={{ margin: 0, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)" }}>
        {label}
      </p>
      <p style={{ margin: "1px 0 0", fontSize: 14, fontWeight: 800, color }}>{value}</p>
    </div>
  );
}

function ToggleButtons<T extends string>({
  options, labels, value, onChange,
}: { options: readonly T[]; labels: Record<string, string>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border"
          style={{
            background: value === o ? "rgba(224,30,30,0.15)" : "transparent",
            borderColor: value === o ? "rgba(224,30,30,0.5)" : "rgba(137,4,4,0.25)",
            color: value === o ? "#fff" : "rgba(245,237,237,0.45)",
          }}
        >
          {labels[o] ?? o}
        </button>
      ))}
    </div>
  );
}

// ── Formulaire de création ───────────────────────────────────────────────

function NewCampaignForm({
  onCreated, onClose,
}: { onCreated: (c: AdCampaign) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<string>("meta");
  const [objective, setObjective] = useState<string>("leads");
  const [budgetDaily, setBudgetDaily] = useState("");
  const [budgetTotal, setBudgetTotal] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Nom de campagne requis.");
      return;
    }
    startTransition(async () => {
      const result = await createAdCampaign({
        name,
        platform,
        objective,
        budgetDaily: budgetDaily.trim() ? Number(budgetDaily.replace(",", ".")) : null,
        budgetTotal: budgetTotal.trim() ? Number(budgetTotal.replace(",", ".")) : null,
        startDate,
        notes: notes || undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onCreated({
        id: result.id ?? `tmp-${Date.now()}`,
        coach_id: "",
        name: name.trim(),
        platform,
        objective,
        status: "active",
        budget_daily: budgetDaily.trim() ? Number(budgetDaily.replace(",", ".")) : null,
        budget_total: budgetTotal.trim() ? Number(budgetTotal.replace(",", ".")) : null,
        spend_total: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        revenue_generated: null,
        start_date: startDate,
        end_date: null,
        notes: notes.trim() || null,
        stopped_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      onClose();
    });
  }

  return (
    <div className="ep-card" style={{ padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de la campagne (ex : Meta — Leads programme été)"
        aria-label="Nom de la campagne"
        className="w-full bg-[#0D0000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60"
        autoFocus
      />
      <div>
        <p style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(245,237,237,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Plateforme</p>
        <ToggleButtons options={AD_PLATFORMS} labels={PLATFORM_LABELS} value={platform as typeof AD_PLATFORMS[number]} onChange={setPlatform} />
      </div>
      <div>
        <p style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(245,237,237,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Objectif</p>
        <ToggleButtons options={AD_OBJECTIVES} labels={OBJECTIVE_LABELS} value={objective as typeof AD_OBJECTIVES[number]} onChange={setObjective} />
      </div>
      <div className="flex gap-2 flex-wrap">
        <input
          value={budgetDaily}
          onChange={(e) => setBudgetDaily(e.target.value)}
          placeholder="Budget quotidien (€, optionnel)"
          aria-label="Budget quotidien"
          inputMode="decimal"
          className="flex-1 min-w-[160px] bg-[#0D0000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60"
        />
        <input
          value={budgetTotal}
          onChange={(e) => setBudgetTotal(e.target.value)}
          placeholder="Budget total (€, optionnel)"
          aria-label="Budget total"
          inputMode="decimal"
          className="flex-1 min-w-[160px] bg-[#0D0000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          aria-label="Date de début"
          className="bg-[#0D0000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#E01E1E]/60"
        />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (ciblage, créa testée, angle...) — optionnel"
        rows={2}
        aria-label="Notes"
        className="w-full bg-[#0D0000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60 resize-none"
      />
      {error && <p style={{ color: "#fb7185", fontSize: 12 }}>{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-white px-2"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="flex-1 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg py-2.5"
        >
          {isPending ? "Création…" : "Créer la campagne"}
        </button>
      </div>
    </div>
  );
}

// ── Panneau d'édition des chiffres ───────────────────────────────────────

function MetricsEditForm({
  campaign, onSave, onCancel,
}: { campaign: AdCampaign; onSave: (patch: Partial<AdCampaign>) => void; onCancel: () => void }) {
  const [spend, setSpend] = useState(String(campaign.spend_total));
  const [impressions, setImpressions] = useState(String(campaign.impressions));
  const [clicks, setClicks] = useState(String(campaign.clicks));
  const [leads, setLeads] = useState(String(campaign.leads));
  const [revenue, setRevenue] = useState(campaign.revenue_generated != null ? String(campaign.revenue_generated) : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const parsed = {
      spendTotal: Number(spend.replace(",", ".")),
      impressions: Number(impressions),
      clicks: Number(clicks),
      leads: Number(leads),
      revenueGenerated: revenue.trim() ? Number(revenue.replace(",", ".")) : null,
    };
    if (Object.values(parsed).some((v) => v !== null && (!Number.isFinite(v) || v < 0))) {
      setError("Chiffres invalides.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateAdCampaign(campaign.id, parsed);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSave({
        spend_total: parsed.spendTotal,
        impressions: parsed.impressions,
        clicks: parsed.clicks,
        leads: parsed.leads,
        revenue_generated: parsed.revenueGenerated,
      });
    });
  }

  const fieldStyle = "bg-[#0D0000] border border-[#890404]/30 rounded-lg px-2.5 py-2 text-xs text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60 w-full";

  return (
    <div style={{ marginTop: 10, background: "rgba(224,30,30,0.05)", border: "1px solid rgba(224,30,30,0.18)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 block mb-1">Dépense totale (€)</label>
          <input value={spend} onChange={(e) => setSpend(e.target.value)} inputMode="decimal" className={fieldStyle} autoFocus />
        </div>
        <div>
          <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 block mb-1">Impressions</label>
          <input value={impressions} onChange={(e) => setImpressions(e.target.value)} inputMode="numeric" className={fieldStyle} />
        </div>
        <div>
          <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 block mb-1">Clics</label>
          <input value={clicks} onChange={(e) => setClicks(e.target.value)} inputMode="numeric" className={fieldStyle} />
        </div>
        <div>
          <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 block mb-1">Leads / conversions</label>
          <input value={leads} onChange={(e) => setLeads(e.target.value)} inputMode="numeric" className={fieldStyle} />
        </div>
        <div className="col-span-2">
          <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 block mb-1">Revenu généré (€, optionnel — pour le ROAS)</label>
          <input value={revenue} onChange={(e) => setRevenue(e.target.value)} inputMode="decimal" className={fieldStyle} placeholder="Laisser vide si inconnu" />
        </div>
      </div>
      {error && <p style={{ color: "#fb7185", fontSize: 11.5 }}>{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-white px-2">
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="flex-1 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg py-2"
        >
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

// ── Carte campagne ───────────────────────────────────────────────────────

function CampaignCard({
  campaign, avgCostPerLead, onUpdate, onDelete,
}: {
  campaign: AdCampaign;
  avgCostPerLead: number | null;
  onUpdate: (id: string, patch: Partial<AdCampaign>) => void;
  onDelete: (id: string) => void;
}) {
  const [editingMetrics, setEditingMetrics] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonDraft, setReasonDraft] = useState(campaign.stopped_reason ?? "");
  const [savingReason, setSavingReason] = useState(false);

  const metrics = useMemo(() => computeCampaignMetrics(campaign), [campaign]);
  const stagnant = isStagnant(campaign);
  const days = daysSinceStart(campaign);

  async function handleStatusChange(next: AdStatus) {
    const prev = campaign.status;
    onUpdate(campaign.id, { status: next });
    const result = await updateAdCampaign(campaign.id, { status: next });
    if (result.error) {
      onUpdate(campaign.id, { status: prev });
      return;
    }
    if (next === "terminee") setReasonOpen(true);
  }

  async function saveReason() {
    setSavingReason(true);
    const result = await updateAdCampaign(campaign.id, { stoppedReason: reasonDraft });
    setSavingReason(false);
    if (!result.error) {
      onUpdate(campaign.id, { stopped_reason: reasonDraft.trim() || null });
      setReasonOpen(false);
    }
  }

  return (
    <div className="ep-card" style={{ padding: "14px 16px" }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-bold text-white truncate" style={{ margin: 0 }}>{campaign.name}</p>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#150000] border border-[#890404]/25 text-[#F5EDED]/40 flex-shrink-0">
              {PLATFORM_LABELS[campaign.platform] ?? campaign.platform}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#150000] border border-[#890404]/25 text-[#F5EDED]/40 flex-shrink-0">
              {OBJECTIVE_LABELS[campaign.objective] ?? campaign.objective}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 10.5, color: "rgba(245,237,237,0.35)" }}>
            {days} jour{days === 1 ? "" : "s"} en cours
            {campaign.budget_daily != null && ` · Budget ${eur(campaign.budget_daily)}/j`}
            {campaign.budget_total != null && ` · Budget total ${eur(campaign.budget_total)}`}
          </p>
        </div>
        <select
          value={campaign.status}
          onChange={(e) => handleStatusChange(e.target.value as AdStatus)}
          aria-label={`Statut de ${campaign.name}`}
          className="flex-shrink-0"
          style={{
            background: "#150000", border: "1px solid rgba(137,4,4,0.3)", borderRadius: 8,
            fontSize: 10.5, fontWeight: 700, padding: "6px 8px", outline: "none",
            color: campaign.status === "active" ? "#4ade80" : campaign.status === "pausee" ? "#facc15" : "rgba(245,237,237,0.4)",
          }}
        >
          {AD_STATUSES.map((s) => (
            <option key={s} value={s} style={{ color: "#F5EDED", background: "#150000" }}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onDelete(campaign.id)}
          aria-label="Supprimer cette campagne"
          className="text-[#F5EDED]/15 hover:text-red-400 flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {stagnant && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: "7px 10px" }}>
          <AlertTriangle size={13} style={{ color: "#f87171", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 11, color: "#f87171", fontWeight: 600 }}>
            Dépense depuis {days} jours sans le moindre lead — à couper ou à revoir.
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12 }}>
        <MetricTile label="Dépensé" value={eur(campaign.spend_total)} color="#F5EDED" />
        <MetricTile label="Impressions" value={int(campaign.impressions)} color="#F5EDED" />
        <MetricTile label="Clics" value={int(campaign.clicks)} color="#F5EDED" />
        <MetricTile label="CTR" value={metrics.ctr !== null ? pct(metrics.ctr) : "···"} color={SEVERITY_COLOR[ctrSeverity(metrics.ctr, campaign.impressions)]} />
        <MetricTile label="CPM" value={metrics.cpm !== null ? eur(metrics.cpm) : "···"} color="#F5EDED" />
        <MetricTile label="CPC" value={metrics.cpc !== null ? eur(metrics.cpc) : "···"} color="#F5EDED" />
        <MetricTile label="Leads" value={int(campaign.leads)} color="#F5EDED" />
        <MetricTile
          label="Coût / lead"
          value={metrics.costPerLead !== null ? eur(metrics.costPerLead) : "···"}
          color={SEVERITY_COLOR[costPerLeadSeverity(metrics.costPerLead, avgCostPerLead)]}
        />
        {metrics.roas !== null && (
          <MetricTile label="ROAS" value={`${metrics.roas.toFixed(1)}x`} color={SEVERITY_COLOR[roasSeverity(metrics.roas)]} />
        )}
      </div>

      {editingMetrics ? (
        <MetricsEditForm
          campaign={campaign}
          onCancel={() => setEditingMetrics(false)}
          onSave={(patch) => {
            onUpdate(campaign.id, patch);
            setEditingMetrics(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingMetrics(true)}
          className="flex items-center gap-1.5 mt-3 text-[10.5px] text-[#F5EDED]/35 hover:text-[#F5EDED]/70 transition-colors"
        >
          <Pencil size={11} /> Mettre à jour les chiffres
        </button>
      )}

      {campaign.status === "terminee" && (
        reasonOpen ? (
          <div style={{ marginTop: 10 }} className="space-y-1.5">
            <textarea
              value={reasonDraft}
              onChange={(e) => setReasonDraft(e.target.value)}
              placeholder="Pourquoi as-tu coupé cette campagne ? (ex : coût par lead trop élevé, jamais rentable après 200€)"
              rows={2}
              aria-label="Raison de l'arrêt"
              className="w-full bg-[#0D0000] border border-[#890404]/30 rounded-lg px-2.5 py-2 text-xs text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60 resize-none"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setReasonOpen(false)} className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-white px-2">
                Annuler
              </button>
              <button
                type="button"
                onClick={saveReason}
                disabled={savingReason}
                className="bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg px-3 py-1.5"
              >
                {savingReason ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setReasonOpen(true)}
            className="flex items-center gap-1.5 mt-2 text-[10.5px] text-[#F5EDED]/35 hover:text-[#F5EDED]/70 transition-colors"
          >
            <StickyNote size={11} />
            {campaign.stopped_reason ? <span className="text-[#F5EDED]/55 italic truncate">{campaign.stopped_reason}</span> : "Pourquoi as-tu coupé cette campagne ?"}
          </button>
        )
      )}
    </div>
  );
}

// ── Composant principal ──────────────────────────────────────────────────

export default function AdsTracker({ initialCampaigns }: { initialCampaigns: AdCampaign[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [statusFilter, setStatusFilter] = useState<AdStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setCampaigns(initialCampaigns);
  }, [initialCampaigns]);

  const totals = useMemo(() => aggregateCampaignTotals(campaigns), [campaigns]);
  const stagnantCount = useMemo(() => campaigns.filter((c) => isStagnant(c)).length, [campaigns]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of campaigns) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [campaigns]);

  const visible = useMemo(() => {
    const filtered = statusFilter === "all" ? campaigns : campaigns.filter((c) => c.status === statusFilter);
    const withMetrics = filtered.map((c) => ({ c, m: computeCampaignMetrics(c) }));
    withMetrics.sort((a, b) => {
      switch (sortKey) {
        case "spend_desc": return b.c.spend_total - a.c.spend_total;
        case "cpl_asc": return (a.m.costPerLead ?? Infinity) - (b.m.costPerLead ?? Infinity);
        case "cpl_desc": return (b.m.costPerLead ?? -Infinity) - (a.m.costPerLead ?? -Infinity);
        case "ctr_desc": return (b.m.ctr ?? -Infinity) - (a.m.ctr ?? -Infinity);
        default: return new Date(b.c.created_at).getTime() - new Date(a.c.created_at).getTime();
      }
    });
    return withMetrics.map((x) => x.c);
  }, [campaigns, statusFilter, sortKey]);

  function handleUpdate(id: string, patch: Partial<AdCampaign>) {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function handleDelete(id: string) {
    const idx = campaigns.findIndex((c) => c.id === id);
    const backup = campaigns[idx];
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    deleteAdCampaign(id).then((result) => {
      if (result.error && backup) {
        setCampaigns((prev) => {
          const next = [...prev];
          next.splice(Math.min(idx, next.length), 0, backup);
          return next;
        });
      }
    });
  }

  function exportCsv() {
    const header = [
      "Nom", "Plateforme", "Objectif", "Statut", "Budget quotidien", "Budget total",
      "Dépense totale", "Impressions", "Clics", "Leads", "CPM", "CPC", "CTR (%)",
      "Coût par lead", "Revenu généré", "ROAS", "Date de début", "Date de fin", "Notes", "Raison de l'arrêt",
    ];
    const rows = campaigns.map((c) => {
      const m = computeCampaignMetrics(c);
      return [
        c.name, c.platform, c.objective, c.status,
        c.budget_daily?.toFixed(2) ?? "", c.budget_total?.toFixed(2) ?? "",
        c.spend_total.toFixed(2), String(c.impressions), String(c.clicks), String(c.leads),
        m.cpm?.toFixed(2) ?? "", m.cpc?.toFixed(2) ?? "", m.ctr?.toFixed(2) ?? "",
        m.costPerLead?.toFixed(2) ?? "", c.revenue_generated?.toFixed(2) ?? "", m.roas?.toFixed(2) ?? "",
        c.start_date ?? "", c.end_date ?? "", c.notes ?? "", c.stopped_reason ?? "",
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => csvEscape(String(v))).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `publicite-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Totaux agrégés — vue d'ensemble immédiate, toutes campagnes confondues */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div className="ep-card" style={{ padding: "12px 14px" }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)" }}>Dépense totale</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: "#F5EDED", margin: "3px 0 0" }}>{eur(totals.spend)}</p>
        </div>
        <div className="ep-card" style={{ padding: "12px 14px" }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)" }}>Leads totaux</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: "#4ade80", margin: "3px 0 0" }}>{int(totals.leads)}</p>
        </div>
        <div className="ep-card" style={{ padding: "12px 14px" }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)" }}>Coût moyen / lead</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: "#F5EDED", margin: "3px 0 0" }}>{totals.avgCostPerLead !== null ? eur(totals.avgCostPerLead) : "···"}</p>
        </div>
        <div className="ep-card" style={{ padding: "12px 14px" }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)" }}>CTR moyen</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: "#F5EDED", margin: "3px 0 0" }}>{totals.avgCtr !== null ? pct(totals.avgCtr) : "···"}</p>
        </div>
      </div>

      {stagnantCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
          <AlertTriangle size={15} style={{ color: "#f87171", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12.5, color: "#f87171", fontWeight: 700 }}>
            {stagnantCount} campagne{stagnantCount > 1 ? "s" : ""} dépense{stagnantCount > 1 ? "nt" : ""} depuis plusieurs jours sans générer aucun lead.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border"
            style={{
              background: statusFilter === "all" ? "rgba(224,30,30,0.14)" : "transparent",
              borderColor: statusFilter === "all" ? "rgba(224,30,30,0.35)" : "rgba(137,4,4,0.25)",
              color: statusFilter === "all" ? "#E01E1E" : "rgba(245,237,237,0.45)",
            }}
          >
            Toutes {campaigns.length > 0 && <span className="opacity-65">{campaigns.length}</span>}
          </button>
          {AD_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border"
              style={{
                background: statusFilter === s ? "rgba(224,30,30,0.14)" : "transparent",
                borderColor: statusFilter === s ? "rgba(224,30,30,0.35)" : "rgba(137,4,4,0.25)",
                color: statusFilter === s ? "#E01E1E" : "rgba(245,237,237,0.45)",
              }}
            >
              {STATUS_LABELS[s]} {countByStatus[s] > 0 && <span className="opacity-65">{countByStatus[s]}</span>}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div style={{ position: "relative" }}>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Trier par"
              style={{
                background: "#150000", border: "1px solid rgba(137,4,4,0.3)", borderRadius: 8,
                fontSize: 10.5, fontWeight: 700, padding: "7px 26px 7px 10px", color: "rgba(245,237,237,0.6)",
                outline: "none", appearance: "none",
              }}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k} style={{ color: "#F5EDED", background: "#150000" }}>{SORT_LABELS[k]}</option>
              ))}
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.35)", pointerEvents: "none" }} />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={campaigns.length === 0}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#E01E1E] disabled:opacity-30 transition-colors border border-[#890404]/25 rounded-lg px-3 py-2"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: "#E01E1E", color: "#fff",
            padding: "9px 16px", borderRadius: 999, fontWeight: 800, fontSize: 12.5, border: "none", cursor: "pointer",
            marginBottom: 16,
          }}
        >
          <Plus size={14} /> Nouvelle campagne
        </button>
      )}

      {showForm && (
        <NewCampaignForm
          onCreated={(c) => setCampaigns((prev) => [c, ...prev])}
          onClose={() => setShowForm(false)}
        />
      )}

      {visible.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <Megaphone size={22} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">
            {campaigns.length === 0
              ? "Aucune campagne suivie pour l'instant. Ajoute ta première campagne Google/Meta Ads."
              : "Aucune campagne ne correspond à ce filtre."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              avgCostPerLead={totals.avgCostPerLead}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
