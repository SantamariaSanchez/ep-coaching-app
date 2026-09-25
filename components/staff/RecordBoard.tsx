"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronDown, Trash2, ExternalLink, Save, X } from "lucide-react";
import { KINDS, type FieldDef, type KindDef, type RecordKind } from "@/lib/staff-roles";
import { isoToParisLocal, parisDate, type StaffRecord } from "@/lib/staff-kpis";
import { createStaffRecord, updateStaffRecord, setStaffRecordStatus, deleteStaffRecord } from "@/app/equipe/actions";

type EditableKind = Exclude<RecordKind, "report">;
type Values = Record<string, string>;

const inputStyle: React.CSSProperties = { width: "100%" };

function fieldValue(def: FieldDef, r: StaffRecord | null): string {
  if (!r) return "";
  switch (def.column) {
    case "title":
      return r.title;
    case "amount":
      return r.amount === null ? "" : String(r.amount);
    case "occurred_on":
      return r.occurred_on ?? "";
    case "due_at":
      return def.type === "date" ? (r.due_at ? parisDate(r.due_at) : "") : isoToParisLocal(r.due_at);
    default: {
      const v = r.data?.[def.key];
      return v === undefined || v === null ? "" : String(v);
    }
  }
}

function initialValues(kind: KindDef, r: StaffRecord | null): Values {
  const out: Values = {};
  for (const f of kind.fields) out[f.key] = fieldValue(f, r);
  return out;
}

const eur = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;

function formatField(def: FieldDef, r: StaffRecord): string | null {
  const raw = fieldValue(def, r);
  if (!raw) return null;
  switch (def.type) {
    case "select":
      return def.options?.find((o) => o.value === raw)?.label ?? raw;
    case "money":
      return eur(Number(raw));
    case "number":
      return Number(raw).toLocaleString("fr-FR");
    case "date":
      return new Date(`${raw}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    case "datetime":
      return r.due_at
        ? new Date(r.due_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
        : null;
    case "url":
      return null;
    default:
      return raw.length > 60 ? `${raw.slice(0, 60)}…` : raw;
  }
}

function FieldInput({ def, value, onChange, idPrefix }: { def: FieldDef; value: string; onChange: (v: string) => void; idPrefix: string }) {
  const id = `${idPrefix}-${def.key}`;
  const common = { id, value, className: "ep-input", style: inputStyle, "aria-label": def.label } as const;
  let control: React.ReactNode;
  switch (def.type) {
    case "textarea":
      control = <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} placeholder={def.placeholder} style={{ ...inputStyle, resize: "vertical" }} />;
      break;
    case "select":
      control = (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          <option value="">Non renseigné</option>
          {def.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
      break;
    case "number":
    case "money":
      control = <input {...common} type="number" inputMode="decimal" step={def.type === "money" ? "0.01" : "1"} min={def.type === "number" ? 0 : undefined} onChange={(e) => onChange(e.target.value)} placeholder={def.placeholder} />;
      break;
    case "date":
      control = <input {...common} type="date" onChange={(e) => onChange(e.target.value)} />;
      break;
    case "datetime":
      control = <input {...common} type="datetime-local" onChange={(e) => onChange(e.target.value)} />;
      break;
    default:
      control = (
        <input
          {...common}
          type={def.type === "email" ? "email" : def.type === "phone" ? "tel" : def.type === "url" ? "url" : "text"}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder ?? (def.type === "url" ? "https://" : undefined)}
        />
      );
  }
  return (
    <div style={{ gridColumn: def.type === "textarea" || def.column === "title" ? "1 / -1" : undefined }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", marginBottom: 5 }}>
        {def.label}
        {def.required && <span style={{ color: "#E01E1E" }}> *</span>}
      </label>
      {control}
    </div>
  );
}

function RecordForm({
  idPrefix,
  kind,
  initial,
  initialStatus,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
  pending,
  error,
}: {
  idPrefix: string;
  kind: KindDef;
  initial: Values;
  initialStatus: string;
  submitLabel: string;
  onSubmit: (status: string, values: Values) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [status, setStatus] = useState(initialStatus);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(status, values);
      }}
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}
    >
      <div>
        <label htmlFor={`${idPrefix}-status`} style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", marginBottom: 5 }}>
          Étape
        </label>
        <select id={`${idPrefix}-status`} value={status} onChange={(e) => setStatus(e.target.value)} className="ep-input" style={inputStyle}>
          {kind.stages.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      {kind.fields.map((f) => (
        <FieldInput key={f.key} idPrefix={idPrefix} def={f} value={values[f.key] ?? ""} onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))} />
      ))}
      {error && (
        <p role="alert" style={{ gridColumn: "1 / -1", fontSize: 12.5, color: "#FDC4C4", margin: 0 }}>{error}</p>
      )}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" disabled={pending} className="ep-btn-primary" style={{ height: 42, padding: "0 20px", fontSize: 12 }}>
          <Save size={14} />
          {pending ? "Enregistrement..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ background: "none", border: "none", color: "rgba(245,237,237,0.45)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, color: "#f87171", fontSize: 11.5, fontWeight: 700, padding: "8px 12px", cursor: "pointer" }}
          >
            <Trash2 size={13} /> Supprimer
          </button>
        )}
      </div>
    </form>
  );
}

function derivedMetrics(kind: EditableKind, r: StaffRecord): string[] {
  if (kind !== "campaign") return [];
  const spend = r.amount ?? 0;
  const leads = Number(r.data?.leads ?? 0);
  const revenue = Number(r.data?.revenue ?? 0);
  const out: string[] = [];
  if (leads > 0 && spend > 0) out.push(`CPL ${eur(Math.round((spend / leads) * 100) / 100)}`);
  if (spend > 0) out.push(`ROAS ${(revenue / spend).toFixed(2)}`);
  return out;
}

function isLate(kind: EditableKind, r: StaffRecord, today: string, nowIso: string): boolean {
  const stage = KINDS[kind].stages.find((s) => s.value === r.status);
  if (stage?.closed) return false;
  if (kind === "deliverable" && r.status === "livre") return false;
  if ((kind === "task" || kind === "deliverable") && r.occurred_on && r.occurred_on < today) return true;
  if (kind === "appointment") return false;
  return !!r.due_at && r.due_at < nowIso && kind !== "opportunity";
}

function RecordRow({ kind, record, today, nowIso }: { kind: EditableKind; record: StaffRecord; today: string; nowIso: string }) {
  const def = KINDS[kind];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const stage = def.stages.find((s) => s.value === record.status) ?? def.stages[0];
  const late = isLate(kind, record, today, nowIso);

  const summary = def.fields
    .filter((f) => f.summary && f.column !== "title")
    .map((f) => formatField(f, record))
    .filter((v): v is string => !!v);
  const links = def.fields.filter((f) => f.type === "url").map((f) => fieldValue(f, record)).filter(Boolean);

  function changeStatus(value: string) {
    startTransition(async () => {
      const r = await setStaffRecordStatus(record.id, value);
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="ep-card" style={{ padding: "12px 14px", borderColor: late ? "rgba(248,113,113,0.35)" : undefined }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <p style={{ fontSize: 13.5, fontWeight: 800, color: "#F5EDED", margin: "0 0 4px", lineHeight: 1.35, display: "flex", alignItems: "center", gap: 6 }}>
            {record.title}
            <ChevronDown size={13} style={{ color: "rgba(245,237,237,0.3)", transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s", flexShrink: 0 }} />
          </p>
          <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)", margin: 0, lineHeight: 1.5 }}>
            {typeof record.data?._assigned_by_name === "string" && (
              <span style={{ color: "#facc15", fontWeight: 700 }}>Assignée par {record.data._assigned_by_name as string} · </span>
            )}
            {[...summary, ...derivedMetrics(kind, record)].join(" · ") || "Aucun détail"}
            {late && <span style={{ color: "#f87171", fontWeight: 700 }}> · En retard</span>}
          </p>
        </button>
        {links[0] && (
          <a href={links[0]} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le lien" style={{ color: "rgba(245,237,237,0.45)", padding: 4 }}>
            <ExternalLink size={14} />
          </a>
        )}
        <select
          aria-label="Changer d'étape"
          value={record.status}
          disabled={pending}
          onChange={(e) => changeStatus(e.target.value)}
          style={{
            flexShrink: 0, maxWidth: 150, fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em",
            color: stage.color, background: "rgba(13,0,0,0.6)", border: `1px solid ${stage.color}55`, borderRadius: 999, padding: "5px 8px", cursor: "pointer",
          }}
        >
          {def.stages.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      {error && !open && <p role="alert" style={{ fontSize: 12, color: "#FDC4C4", margin: "8px 0 0" }}>{error}</p>}
      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(245,237,237,0.06)" }}>
          <RecordForm
            idPrefix={`edit-${record.id}`}
            kind={def}
            initial={initialValues(def, record)}
            initialStatus={record.status}
            submitLabel="Enregistrer"
            pending={pending}
            error={error}
            onCancel={() => setOpen(false)}
            onSubmit={(status, values) =>
              startTransition(async () => {
                setError(null);
                const r = await updateStaffRecord(record.id, status, values);
                if ("error" in r) setError(r.error);
                else {
                  setOpen(false);
                  router.refresh();
                }
              })
            }
            onDelete={() => {
              if (!window.confirm(`Supprimer "${record.title}" ? Cette action est définitive.`)) return;
              startTransition(async () => {
                const r = await deleteStaffRecord(record.id);
                if ("error" in r) setError(r.error);
                else router.refresh();
              });
            }}
          />
        </div>
      )}
    </div>
  );
}

function dayHeading(iso: string, today: string): string {
  const d = parisDate(iso);
  if (d === today) return "Aujourd'hui";
  const tomorrow = parisDate(new Date(new Date(`${today}T12:00:00`).getTime() + 86_400_000));
  if (d === tomorrow) return "Demain";
  return new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function RecordBoard({ kind, records }: { kind: EditableKind; records: StaffRecord[] }) {
  const def = KINDS[kind];
  const router = useRouter();
  const [filter, setFilter] = useState<string>("actifs");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const now = new Date();
  const today = parisDate(now);
  const nowIso = now.toISOString();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of records) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [records]);
  const activeCount = records.filter((r) => !def.stages.find((s) => s.value === r.status)?.closed).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = records.filter((r) => {
      if (filter === "actifs" && def.stages.find((s) => s.value === r.status)?.closed) return false;
      if (filter !== "actifs" && filter !== "tous" && r.status !== filter) return false;
      if (!q) return true;
      return [r.title, ...Object.values(r.data ?? {}).filter((v) => typeof v === "string")].some((v) => String(v).toLowerCase().includes(q));
    });
    if (def.sort === "due_asc") {
      list = [...list].sort((a, b) => {
        const ka = a.due_at ?? (a.occurred_on ? `${a.occurred_on}T23:59` : "9999");
        const kb = b.due_at ?? (b.occurred_on ? `${b.occurred_on}T23:59` : "9999");
        return ka.localeCompare(kb);
      });
    }
    return list;
  }, [records, filter, query, def]);

  const isAgenda = kind === "appointment";
  const upcoming = isAgenda ? visible.filter((r) => !r.due_at || parisDate(r.due_at) >= today) : visible;
  const past = isAgenda ? visible.filter((r) => r.due_at && parisDate(r.due_at) < today).reverse() : [];

  const dayOf = (r: StaffRecord) => (isAgenda && r.due_at ? dayHeading(r.due_at, today) : null);
  const headings = upcoming.map((r, i) => {
    const h = dayOf(r);
    return h && (i === 0 || dayOf(upcoming[i - 1]) !== h) ? h : null;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          className="ep-btn-primary"
          style={{ height: 40, padding: "0 16px", fontSize: 12 }}
        >
          {adding ? <X size={14} /> : <Plus size={14} />}
          {adding ? "Fermer" : def.addLabel}
        </button>
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 320 }}>
          <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.3)" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher" aria-label="Rechercher" className="ep-input" style={{ paddingLeft: 32, height: 40 }} />
        </div>
      </div>

      {adding && (
        <div className="ep-card-hero" style={{ padding: "16px 16px", marginBottom: 14 }}>
          <RecordForm
            key={formKey}
            idPrefix={`new-${kind}`}
            kind={def}
            initial={initialValues(def, null)}
            initialStatus={def.stages[0].value}
            submitLabel={def.addLabel}
            pending={pending}
            error={error}
            onCancel={() => setAdding(false)}
            onSubmit={(status, values) =>
              startTransition(async () => {
                setError(null);
                const r = await createStaffRecord(kind, status, values);
                if ("error" in r) setError(r.error);
                else {
                  setFormKey((k) => k + 1);
                  setAdding(false);
                  router.refresh();
                }
              })
            }
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>
        {[
          { value: "actifs", label: `En cours (${activeCount})` },
          ...def.stages.map((s) => ({ value: s.value, label: `${s.label} (${counts[s.value] ?? 0})` })),
          { value: "tous", label: `Tout (${records.length})` },
        ].map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setFilter(chip.value)}
            aria-pressed={filter === chip.value}
            style={{
              flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "6px 11px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
              color: filter === chip.value ? "#F5EDED" : "rgba(245,237,237,0.5)",
              background: filter === chip.value ? "rgba(224,30,30,0.16)" : "rgba(245,237,237,0.03)",
              border: `1px solid ${filter === chip.value ? "rgba(224,30,30,0.4)" : "rgba(245,237,237,0.08)"}`,
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="ep-card" style={{ padding: "22px 18px", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.45)", margin: 0 }}>{records.length === 0 ? def.emptyText : "Rien ne correspond à ce filtre."}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upcoming.map((r, i) => {
            const heading = headings[i];
            return (
              <div key={r.id}>
                {heading && <p className="ep-label" style={{ margin: "10px 2px 6px", textTransform: "capitalize" }}>{heading}</p>}
                <RecordRow kind={kind} record={r} today={today} nowIso={nowIso} />
              </div>
            );
          })}
          {past.length > 0 && (
            <>
              <p className="ep-label" style={{ margin: "16px 2px 6px" }}>Passés</p>
              {past.map((r) => (
                <RecordRow key={r.id} kind={kind} record={r} today={today} nowIso={nowIso} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
