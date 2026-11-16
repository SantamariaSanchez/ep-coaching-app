"use client";

import { useState, useTransition } from "react";
import { Phone, Mail, MessageCircle, ChevronDown, Copy, Check } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { safeAction } from "@/lib/safe-action";
import { updatePrequalStatus } from "@/app/dashboard/coach/admin/leads/actions";
import {
  PREQUAL_STATUSES, PREQUAL_STATUS_LABELS, firstContactMessage, prequalAnswerLines, waitingDays, whatsappNumber,
  type PrequalStatus,
} from "@/lib/prequal-inbox";

export interface PrequalRow {
  id: string;
  form_type: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  answers: Record<string, unknown> | null;
  status: PrequalStatus;
  created_at: string;
}

// Candidatures à rappeler : nom, attente, et le contact en un geste
// (appel, WhatsApp avec un premier message prêt, mail). Les réponses du
// formulaire restent repliées. Un statut se change en un tap.
export default function PrequalInbox({ rows, coachName }: { rows: PrequalRow[]; coachName: string | null }) {
  const t = useT();
  const [items, setItems] = useState(rows);
  const [showDone, setShowDone] = useState(false);
  const open = items.filter((r) => r.status === "nouveau");
  const done = items.filter((r) => r.status !== "nouveau");

  function setStatus(id: string, status: PrequalStatus) {
    const backup = items;
    setItems((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    void safeAction(() => updatePrequalStatus(id, status)).then((res) => { if (res.error) setItems(backup); });
  }

  return (
    <section id="candidatures" className="ep-card mb-8" style={{ padding: "16px 16px 12px", scrollMarginTop: 80 }} aria-labelledby="candidatures-titre">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 id="candidatures-titre" className="text-sm font-black uppercase tracking-wide">{t("Candidatures à rappeler")}</h2>
        <span className="text-[12px] font-black" style={{ color: open.length ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.4)" }}>{open.length}</span>
      </div>
      {open.length === 0 && <p className="text-xs text-(--ep-ink)/40 mb-2">{t("Personne à rappeler. Tout est traité.")}</p>}
      <ul className="flex flex-col gap-2">
        {open.map((r) => <Row key={r.id} r={r} coachName={coachName} onStatus={setStatus} />)}
      </ul>
      {done.length > 0 && (
        <>
          <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="mt-3 text-[11.5px] font-bold text-(--ep-ink)/50 inline-flex items-center gap-1">
            <ChevronDown size={12} style={{ transform: showDone ? "rotate(180deg)" : "none" }} /> {t("Déjà traitées")} ({done.length})
          </button>
          {showDone && <ul className="flex flex-col gap-2 mt-2">{done.map((r) => <Row key={r.id} r={r} coachName={coachName} onStatus={setStatus} />)}</ul>}
        </>
      )}
    </section>
  );
}

function Row({ r, coachName, onStatus }: { r: PrequalRow; coachName: string | null; onStatus: (id: string, s: PrequalStatus) => void }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();
  const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || r.email || t("Sans nom");
  const days = waitingDays(r.created_at);
  const wa = whatsappNumber(r.phone);
  const msg = firstContactMessage(r.first_name, coachName);
  const lines = prequalAnswerLines(r.answers);
  const btn = "h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-[12px] font-extrabold border";
  const btnStyle = { borderColor: "rgba(var(--ep-ink-rgb),0.14)", color: "var(--ep-ink)" } as const;

  return (
    <li className="rounded-xl p-3" style={{ background: "rgba(var(--ep-shade-rgb),0.3)" }}>
      <div className="flex items-center gap-2">
        <p className="flex-1 min-w-0 truncate text-[13.5px] font-black text-(--ep-ink)">{name}</p>
        <span className="text-[11px] font-bold shrink-0" style={{ color: r.status === "nouveau" && days >= 2 ? "var(--ep-warn)" : "rgba(var(--ep-ink-rgb),0.45)" }}>
          {r.form_type === "business" ? t("Business") : t("Physique")} · {days === 0 ? t("aujourd'hui") : t("il y a {n} j", { n: days })}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {r.phone && <a href={`tel:${r.phone}`} className={btn} style={btnStyle}><Phone size={13} /> {t("Appeler")}</a>}
        {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className={btn} style={btnStyle}><MessageCircle size={13} /> WhatsApp</a>}
        {r.email && <a href={`mailto:${r.email}?subject=${encodeURIComponent(t("Ton formulaire EP Coaching"))}&body=${encodeURIComponent(msg)}`} className={btn} style={btnStyle}><Mail size={13} /> {t("Mail")}</a>}
        <button type="button" className={btn} style={btnStyle} onClick={() => { void navigator.clipboard?.writeText(msg).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>
          {copied ? <Check size={13} /> : <Copy size={13} />} {t("Message")}
        </button>
      </div>
      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto" role="radiogroup" aria-label={t("Statut")}>
        {PREQUAL_STATUSES.map((s) => (
          <button
            key={s} type="button" role="radio" aria-checked={r.status === s}
            onClick={() => start(() => onStatus(r.id, s))}
            className="shrink-0 h-7 px-2.5 rounded-full text-[11px] font-bold border"
            style={{
              borderColor: r.status === s ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.12)",
              background: r.status === s ? "rgba(var(--ep-accent-rgb),0.16)" : "transparent",
              color: r.status === s ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.55)",
            }}
          >
            {t(PREQUAL_STATUS_LABELS[s])}
          </button>
        ))}
      </div>
      {lines.length > 0 && (
        <>
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="mt-2 text-[11.5px] font-bold text-(--ep-ink)/50 inline-flex items-center gap-1">
            <ChevronDown size={12} style={{ transform: expanded ? "rotate(180deg)" : "none" }} /> {t("Ses réponses")}
          </button>
          {expanded && (
            <dl className="mt-1.5 grid gap-1">
              {lines.map((l) => (
                <div key={l.label} className="text-[12px] leading-snug">
                  <dt className="inline font-bold text-(--ep-ink)/55">{t(l.label)} : </dt>
                  <dd className="inline text-(--ep-ink)">{l.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </li>
  );
}
