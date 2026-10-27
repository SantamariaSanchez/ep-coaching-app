"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { Trash2, Plus, ChevronDown, Lightbulb } from "lucide-react";
import type { SalesCall } from "@/lib/sales-calls";
import { SALES_CALL_KINDS, SALES_CALL_KIND_LABEL, type SalesCallKind } from "@/lib/sales-call-kinds";
import { addSalesCall, updateSalesCall, deleteSalesCall, sendProspectQuestionsToStudio } from "@/app/dashboard/coach/admin/ventes/actions";
import { safeAction } from "@/lib/safe-action";

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
  const text = value === null ? "···" : value ? labelYes : labelNo;
  const color = value === null ? "rgba(var(--ep-ink-rgb),0.35)" : value ? "var(--ep-ok)" : "var(--ep-bad)";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      style={{
        fontSize: 11,
        fontWeight: 700,
        color,
        background: "rgba(var(--ep-ink-rgb),0.04)",
        border: "1px solid rgba(var(--ep-ink-rgb),0.1)",
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

type CallPatch = Parameters<typeof updateSalesCall>[1];

// Détails d'un appel : enregistrement (avec l'accord de la personne), retour
// d'appel en vidéo courte, questions posées (chacune est un contenu à faire).
function CallDetails({ call, patch }: { call: SalesCall; patch: (p: CallPatch) => void }) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [recording, setRecording] = useState(call.recording_url ?? "");
  const [followup, setFollowup] = useState(call.followup_url ?? "");
  const [questions, setQuestions] = useState(call.prospect_questions ?? "");
  const [notes, setNotes] = useState(call.notes ?? "");
  const [info, setInfo] = useState<string | null>(null);
  const labelCls = "text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-1 block";

  function sendToStudio() {
    startTransition(async () => {
      await safeAction(() => updateSalesCall(call.id, { prospect_questions: questions }));
      const res = await safeAction(() => sendProspectQuestionsToStudio(call.id));
      setInfo(res.error ? res.error : res.added ? `${res.added} ${t("idée(s) ajoutée(s) au Studio.")}` : t("Déjà dans le Studio."));
    });
  }

  return (
    <div className="basis-full grid gap-3 pt-3 mt-1 border-t border-(--ep-line)/15" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
      <div>
        <label className={labelCls}>{t("Type d'appel")}</label>
        <select
          aria-label={t("Type d'appel")}
          className="ep-input"
          value={call.call_kind}
          onChange={(e) => patch({ call_kind: e.target.value as SalesCallKind })}
        >
          {SALES_CALL_KINDS.map((k) => (
            <option key={k} value={k}>{t(SALES_CALL_KIND_LABEL[k])}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>{t("Enregistrement de l'appel (lien)")}</label>
        <input
          type="url"
          className="ep-input"
          placeholder="https://"
          aria-label={t("Enregistrement de l'appel (lien)")}
          value={recording}
          onChange={(e) => setRecording(e.target.value)}
          onBlur={() => patch({ recording_url: recording.trim() || null })}
        />
        <label className="flex items-center gap-2 mt-2 text-[11px] text-(--ep-ink)/55 cursor-pointer">
          <input
            type="checkbox"
            checked={call.recording_consent === true}
            onChange={(e) => patch({ recording_consent: e.target.checked })}
          />
          {t("La personne a accepté l'enregistrement")}
        </label>
      </div>
      <div>
        <label className={labelCls}>{t("Retour d'appel (vidéo de moins de 5 minutes ou vocal)")}</label>
        <input
          type="url"
          className="ep-input"
          placeholder="https://"
          aria-label={t("Retour d'appel (vidéo de moins de 5 minutes ou vocal)")}
          value={followup}
          onChange={(e) => setFollowup(e.target.value)}
          onBlur={() => patch({ followup_url: followup.trim() || null })}
        />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label className={labelCls}>{t("Questions posées par la personne (une par ligne)")}</label>
        <textarea
          className="ep-input"
          rows={3}
          aria-label={t("Questions posées par la personne (une par ligne)")}
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
          onBlur={() => patch({ prospect_questions: questions.trim() || null })}
        />
        <button
          type="button"
          onClick={sendToStudio}
          disabled={isPending || !questions.trim()}
          className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-accent) disabled:opacity-40"
        >
          <Lightbulb size={12} />{" "}{t("Envoyer au Studio comme idées de contenu")}
        </button>
        {info && <span className="ml-3 text-[11px] text-(--ep-ink)/50">{info}</span>}
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label className={labelCls}>{t("Notes")}</label>
        <textarea
          className="ep-input"
          rows={2}
          aria-label={t("Notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (call.notes ?? "") && patch({ notes })}
        />
      </div>
    </div>
  );
}

function CallRow({ call }: { call: SalesCall }) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [revenue, setRevenue] = useState(call.revenue_amount != null ? String(call.revenue_amount) : "");
  const [open, setOpen] = useState(false);

  function patch(p: CallPatch) {
    startTransition(async () => {
      await safeAction(() => updateSalesCall(call.id, p));
    });
  }

  return (
    <div className="flex items-center gap-3 bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl px-4 py-3.5 flex-wrap" style={{ opacity: isPending ? 0.6 : 1 }}>
      <div className="flex-1 min-w-[140px]">
        <p className="text-sm font-bold text-(--ep-strong) truncate">{call.lead_name}</p>
        <span className="text-[10px] text-(--ep-ink)/35">{formatDate(call.call_date)}</span>
      </div>
      <TriState value={call.show_up} onChange={(v) => patch({ show_up: v })} labelYes="Venu" labelNo="Absent" />
      <TriState value={call.closed} onChange={(v) => patch({ closed: v })} labelYes="Signé" labelNo="Perdu" />
      <input
        type="number"
        inputMode="decimal"
        placeholder={t("CA €")} aria-label={t("CA €")}
        value={revenue}
        onChange={(e) => setRevenue(e.target.value)}
        onBlur={() => patch({ revenue_amount: revenue.trim() ? Number(revenue) : null })}
        className="ep-input"
        style={{ width: 80, padding: "6px 8px", fontSize: 12 }}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t("Détails de l'appel")}
        style={{ color: "rgba(var(--ep-ink-rgb),0.4)", background: "none", border: "none", cursor: "pointer", padding: 4 }}
      >
        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      <button
        type="button"
        onClick={() => startTransition(async () => { await safeAction(() => deleteSalesCall(call.id)); })}
        style={{ color: "rgba(var(--ep-ink-rgb),0.25)", background: "none", border: "none", cursor: "pointer", padding: 4 }}
        aria-label={t("Supprimer")}
      >
        <Trash2 size={14} />
      </button>
      {open && <CallDetails call={call} patch={patch} />}
    </div>
  );
}

export default function SalesCallsTable({ calls }: { calls: SalesCall[] }) {
  const t = useT();
  const [leadName, setLeadName] = useState("");
  const [callDate, setCallDate] = useState(todayStr());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!leadName.trim()) return;
    startTransition(async () => {
      const result = await safeAction(() => addSalesCall({ leadName, callDate }));
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
          placeholder={t("Nom du lead")} aria-label={t("Nom du lead")}
          value={leadName}
          onChange={(e) => setLeadName(e.target.value)}
          className="ep-input"
          style={{ flex: 1, minWidth: 140 }}
        />
        <input
          type="date"
          value={callDate}
          onChange={(e) => setCallDate(e.target.value)}
          aria-label={t("Date de l'appel")}
          className="ep-input"
          style={{ width: 140 }}
        />
        <button type="submit" disabled={isPending} className="ep-btn-primary" style={{ height: 40, padding: "0 16px", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} />{" "}{t("Ajouter")}
        </button>
      </form>
      {error && <p style={{ color: "var(--ep-bad)", fontSize: 12, marginBottom: 12 }}>{t(error)}</p>}

      <div className="space-y-2">
        {calls.map((c) => (
          <CallRow key={c.id} call={c} />
        ))}
      </div>
    </div>
  );
}
