"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import type { BilanField } from "@/lib/tracking-profile";
import type { DailyLog } from "@/utils/daily-logs";

// Bilan du jour en un seul écran, pensé pour moins de 20 secondes : chaque
// réponse s'enregistre toute seule (plus de bouton Enregistrer par carte),
// les valeurs sont pré-remplies avec la dernière connue (un tap pour
// confirmer), et seuls les champs que le moteur de tracking juge utiles à
// cette personne sont affichés (lib/tracking-profile.ts). Le reste est à un
// tap sous « Plus de détails », jamais perdu.

export type QuickAction = (
  prev: { error?: string; success?: boolean } | null,
  formData: FormData
) => Promise<{ error?: string; success?: boolean }>;

export interface QuickBilanProps {
  today: string;
  existing: DailyLog | null;
  action: QuickAction;
  /** Champs principaux (niveau de suivi ∩ modules actifs), dans l'ordre. */
  fields: BilanField[];
  /** Champs permis par la personne mais hors niveau : sous « Plus de détails ». */
  extraFields: BilanField[];
  /** Les 3 infos de la version rapide. */
  minimum: BilanField[];
  /** Jour de pesée pour cette personne ? Sinon la pesée est repliée. */
  isWeighDay: boolean;
  nextWeighLabel?: string | null;
  lastWeight: number | null;
  lastSleep: number | null;
  autoSteps: number | null;
  /** Nom de la séance du jour (programme), pour cocher « séance faite » en un tap. */
  sessionName?: string | null;
  /** Diète du jour suivie ? Une seule question quand un plan existe. */
  hasPlan?: boolean;
  trackerHref?: string;
  /** Sommeil et FC importés automatiquement : rien à saisir. */
  tone?: "encourageant" | "neutre" | "technique";
  /** Proposer la version rapide (3 infos) : niveaux Standard et Avancé. */
  allowQuick?: boolean;
  /** Message affiché une fois le bilan complet. */
  doneNote?: string | null;
}

const chipBase: React.CSSProperties = {
  minHeight: 44, borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer",
  border: "1px solid rgba(var(--ep-line-rgb),0.3)", background: "rgba(var(--ep-shade-rgb),0.3)", color: "rgba(var(--ep-ink-rgb),0.7)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px", flex: 1,
};
const chipOn: React.CSSProperties = { background: "var(--ep-accent)", borderColor: "var(--ep-accent)", color: "var(--ep-strong)" };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.5)", margin: "0 0 6px" };

function Chips<T extends string | number>({ value, options, onPick, label }: { value: T | null; options: { v: T; label: string }[]; onPick: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} style={{ display: "flex", gap: 6 }}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={value === o.v} onClick={() => onPick(o.v)} style={{ ...chipBase, ...(value === o.v ? chipOn : null) }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Stepper pré-rempli : un tap sur « OK » confirme la valeur suggérée, ± ajuste puis enregistre seul. */
function Stepper({
  value, suggested, step, min, max, unit, format, onCommit, label, decimals = 1,
}: {
  value: number | null; suggested: number | null; step: number; min: number; max: number; unit: string;
  format?: (n: number) => string; onCommit: (n: number) => void; label: string; decimals?: number;
}) {
  const t = useT();
  const [draft, setDraft] = useState<number | null>(value ?? suggested);
  const [saved, setSaved] = useState(value != null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const round = (n: number) => Number(n.toFixed(decimals));
  const clamp = (n: number) => Math.min(max, Math.max(min, round(n)));
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function change(delta: number) {
    const next = clamp((draft ?? min) + delta);
    setDraft(next);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { onCommit(next); setSaved(true); }, 700);
  }
  function confirm() {
    if (draft == null) return;
    if (timer.current) clearTimeout(timer.current);
    onCommit(draft);
    setSaved(true);
  }
  const shown = draft == null ? "···" : format ? format(draft) : String(draft).replace(".", ",");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button type="button" onClick={() => change(-step)} aria-label={`${label} -`} style={{ ...chipBase, flex: "0 0 48px", minHeight: 48 }}><Minus size={18} /></button>
      <div style={{ flex: 1, textAlign: "center", fontSize: 24, fontWeight: 900, color: draft == null ? "rgba(var(--ep-ink-rgb),0.3)" : "var(--ep-ink)", fontVariantNumeric: "tabular-nums" }}>
        {shown}<span style={{ fontSize: 13, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.45)", marginLeft: 4 }}>{unit}</span>
      </div>
      <button type="button" onClick={() => change(step)} aria-label={`${label} +`} style={{ ...chipBase, flex: "0 0 48px", minHeight: 48 }}><Plus size={18} /></button>
      <button
        type="button" onClick={confirm} disabled={draft == null} aria-label={t("Valider")}
        style={{ ...chipBase, flex: "0 0 56px", minHeight: 48, ...(saved ? { background: "rgba(var(--ep-ok-rgb),0.14)", borderColor: "rgba(var(--ep-ok-rgb),0.4)", color: "var(--ep-ok)" } : chipOn) }}
      >
        {saved ? <Check size={18} strokeWidth={3} /> : t("OK")}
      </button>
    </div>
  );
}

function hm(n: number): string {
  const total = Math.round(n * 60);
  const h = Math.floor(total / 60), m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

const TRI = [{ v: "low", label: "Bas" }, { v: "medium", label: "Moyen" }, { v: "high", label: "Haut" }];

export default function QuickBilan(props: QuickBilanProps) {
  const t = useT();
  const { today, existing, action, minimum } = props;
  const [log, setLog] = useState<Partial<DailyLog>>(existing ?? {});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const quickStored = useSyncExternalStore(
    (cb) => { window.addEventListener("ep-bilan-quick", cb); return () => window.removeEventListener("ep-bilan-quick", cb); },
    () => { try { return localStorage.getItem("ep-bilan-quick") === "1"; } catch { return false; } },
    () => false
  );
  const quick = quickStored;
  const [weighAnyway, setWeighAnyway] = useState(false);
  const doneSent = useRef(false);

  // Version rapide mémorisée sur cet appareil (confort, jamais critique).
  function toggleQuick() {
    try { localStorage.setItem("ep-bilan-quick", quick ? "0" : "1"); } catch { /* ignoré */ }
    window.dispatchEvent(new Event("ep-bilan-quick"));
  }

  // Niveau Avancé : une quinzaine de données, les 6 premières à l'écran, le
  // reste sous « Plus de détails » (jamais perdu, jamais obligatoire).
  const MAX_PRIMARY = 6;
  const shortList = props.allowQuick && quick ? props.fields.filter((f) => minimum.includes(f)) : props.fields.slice(0, MAX_PRIMARY);
  const primary = shortList;
  const details = [...props.fields.filter((f) => !shortList.includes(f)), ...props.extraFields];

  const filled = useCallback((f: BilanField, l: Partial<DailyLog>): boolean => {
    switch (f) {
      case "poids": return l.weight_morning != null;
      case "seance": return !!l.training_name;
      case "pas": return l.steps != null;
      case "energie": return l.energy != null;
      case "sommeil": return l.sleep_hours != null;
      case "digestion": return !!l.digestion;
      case "stress": return !!l.stress;
      case "humeur": return l.mood != null;
      case "faim": return !!l.hunger;
      case "courbatures": return l.soreness != null;
      case "hydratation": return l.water_l != null;
      case "sommeil_qualite": return l.sleep_rating != null;
      case "horaires_sommeil": return !!l.bedtime_actual && !!l.wake_time_actual;
      case "cardio_repos": return l.resting_hr != null;
    }
  }, []);

  const needsWeigh = primary.includes("poids") && (props.isWeighDay || weighAnyway || existing?.weight_morning != null);
  const required = primary.filter((f) => (f === "poids" ? needsWeigh : true));
  const doneCount = required.filter((f) => filled(f, log)).length;
  const complete = required.length > 0 && doneCount === required.length;

  const save = useCallback(async (patch: Record<string, string | number | null>, extra?: Record<string, string>) => {
    const fd = new FormData();
    fd.set("log_date", today);
    fd.set("autosave", "1");
    for (const [k, v] of Object.entries(patch)) fd.set(k, v == null ? "" : String(v));
    for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
    setStatus("saving");
    const res = await action(null, fd);
    setStatus(res.error ? "error" : "saved");
  }, [action, today]);

  function put(patch: Partial<DailyLog>, send?: Record<string, string | number | null>) {
    setLog((l) => ({ ...l, ...patch }));
    void save((send ?? patch) as Record<string, string | number | null>);
  }

  // Bilan complet : un seul signal final (points, message au coach).
  useEffect(() => {
    if (complete && !doneSent.current && status === "saved") {
      doneSent.current = true;
      const fd = new FormData();
      fd.set("log_date", today);
      fd.set("autosave_done", "1");
      void action(null, fd);
    }
  }, [complete, status, action, today]);

  const row = (f: BilanField) => {
    switch (f) {
      case "poids":
        if (!needsWeigh) {
          return (
            <Row key={f} label={t("Poids")}>
              <button type="button" onClick={() => setWeighAnyway(true)} style={{ ...chipBase, flex: "none", width: "100%", minHeight: 44, fontWeight: 700 }}>
                {props.nextWeighLabel ? `${t("Pas de pesée aujourd'hui, prochaine :")} ${props.nextWeighLabel}` : t("Pas de pesée aujourd'hui")}
                {" · "}{t("Me peser quand même")}
              </button>
            </Row>
          );
        }
        return (
          <Row key={f} label={t("Poids à jeun")} hint={log.weight_morning == null && props.lastWeight != null ? t("Dernier poids pré-rempli : un tap pour confirmer") : undefined}>
            <Stepper
              label={t("Poids")} value={log.weight_morning ?? null} suggested={props.lastWeight} step={0.1} min={30} max={300} unit="kg"
              onCommit={(n) => put({ weight_morning: n }, { weight_morning: n, weight_time: new Date().toTimeString().slice(0, 5) })}
            />
          </Row>
        );
      case "seance":
        return (
          <Row key={f} label={t("Séance du jour")}>
            <Chips
              label={t("Séance du jour")}
              value={!log.training_name ? null : log.training_name === "Repos" ? "repos" : "faite"}
              options={[{ v: "faite", label: props.sessionName ? `${t("Faite")} · ${props.sessionName}` : t("Séance faite") }, { v: "repos", label: t("Repos") }]}
              onPick={(v) => put({ training_name: v === "repos" ? "Repos" : props.sessionName || "Séance" })}
            />
          </Row>
        );
      case "energie":
        return (
          <Row key={f} label={t("Comment tu te sens ?")}>
            <Chips label={t("Énergie")} value={log.energy ?? null} options={[1, 2, 3, 4, 5].map((v) => ({ v, label: String(v) }))} onPick={(v) => put({ energy: v })} />
            <Scale low={t("À plat")} high={t("Au top")} />
          </Row>
        );
      case "pas":
        return (
          <Row key={f} label={t("Pas")} hint={log.steps == null && props.autoSteps != null ? t("Compté automatiquement : un tap pour confirmer") : undefined}>
            <Stepper
              label={t("Pas")} value={log.steps ?? null} suggested={props.autoSteps} step={1000} min={0} max={100000} unit="" decimals={0}
              format={(n) => n.toLocaleString("fr-FR")} onCommit={(n) => put({ steps: n })}
            />
          </Row>
        );
      case "sommeil":
        return (
          <Row key={f} label={t("Sommeil")}>
            <Stepper
              label={t("Sommeil")} value={log.sleep_hours ?? null} suggested={props.lastSleep ?? 7.5} step={0.5} min={0} max={16} unit="" decimals={2}
              format={hm} onCommit={(n) => put({ sleep_hours: n })}
            />
          </Row>
        );
      case "digestion":
        return (
          <Row key={f} label={t("Digestion")}>
            <Chips label={t("Digestion")} value={log.digestion ?? null} options={[{ v: "OK", label: t("OK") }, { v: "Ballonné", label: t("Ballonné") }, { v: "Lourd", label: t("Lourd") }]} onPick={(v) => put({ digestion: v })} />
          </Row>
        );
      case "stress":
        return <Row key={f} label={t("Stress")}><Chips label={t("Stress")} value={log.stress ?? null} options={TRI.map((o) => ({ v: o.v, label: t(o.label) }))} onPick={(v) => put({ stress: v as DailyLog["stress"] })} /></Row>;
      case "faim":
        return <Row key={f} label={t("Faim")}><Chips label={t("Faim")} value={log.hunger ?? null} options={TRI.map((o) => ({ v: o.v, label: t(o.label) }))} onPick={(v) => put({ hunger: v as DailyLog["hunger"] })} /></Row>;
      case "humeur":
        return <Row key={f} label={t("Moral")}><Chips label={t("Moral")} value={log.mood ?? null} options={[1, 2, 3, 4, 5].map((v) => ({ v, label: String(v) }))} onPick={(v) => put({ mood: v })} /><Scale low={t("Bas")} high={t("Excellent")} /></Row>;
      case "courbatures":
        return <Row key={f} label={t("Courbatures")}><Chips label={t("Courbatures")} value={log.soreness ?? null} options={[1, 2, 3, 4, 5].map((v) => ({ v, label: String(v) }))} onPick={(v) => put({ soreness: v })} /><Scale low={t("Aucune")} high={t("Très fortes")} /></Row>;
      case "hydratation":
        return (
          <Row key={f} label={t("Eau bue")}>
            <Stepper label={t("Eau")} value={log.water_l ?? null} suggested={2} step={0.25} min={0} max={15} unit="L" decimals={2} onCommit={(n) => put({ water_l: n })} />
          </Row>
        );
      case "sommeil_qualite":
        return (
          <Row key={f} label={t("Qualité du sommeil")}>
            <Chips label={t("Qualité du sommeil")} value={log.sleep_rating ?? null} options={[20, 40, 60, 80, 100].map((v) => ({ v, label: `${v}` }))} onPick={(v) => put({ sleep_rating: v })} />
          </Row>
        );
      case "horaires_sommeil":
        return (
          <Row key={f} label={t("Coucher et lever")}>
            <div style={{ display: "flex", gap: 8 }}>
              <TimeField label={t("Coucher (hier soir)")} value={log.bedtime_actual?.slice(0, 5) ?? ""} onChange={(v) => put({ bedtime_actual: v })} />
              <TimeField label={t("Lever (ce matin)")} value={log.wake_time_actual?.slice(0, 5) ?? ""} onChange={(v) => put({ wake_time_actual: v })} />
            </div>
          </Row>
        );
      case "cardio_repos":
        return (
          <Row key={f} label={t("FC de repos et VFC")}>
            <div style={{ display: "flex", gap: 8 }}>
              <NumField label={t("FC repos (bpm)")} value={log.resting_hr ?? null} min={25} max={220} onChange={(v) => put({ resting_hr: v })} />
              <NumField label={t("VFC (ms)")} value={log.hrv ?? null} min={5} max={300} onChange={(v) => put({ hrv: v })} />
            </div>
          </Row>
        );
    }
  };

  const message = props.tone === "encourageant" ? t("Bravo, c'est fait. Chaque jour compte.") : props.doneNote ?? t("Bilan du jour terminé.");

  return (
    <section className="ep-card" aria-label={t("Bilan du jour")} style={{ padding: "14px 14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <p style={{ ...labelStyle, margin: 0, flex: 1 }}>{t("Bilan du jour")}</p>
        <span aria-live="polite" style={{ fontSize: 11, fontWeight: 800, color: status === "error" ? "var(--ep-bad)" : "var(--ep-ok)" }}>
          {status === "saving" ? "…" : status === "saved" ? t("Enregistré") : status === "error" ? t("Erreur, réessaie") : ""}
        </span>
        <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(var(--ep-ink-rgb),0.45)" }}>{doneCount}/{required.length}</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: "rgba(var(--ep-ink-rgb),0.07)", marginBottom: 12, overflow: "hidden" }}>
        <div style={{ width: `${required.length ? (doneCount / required.length) * 100 : 0}%`, height: "100%", background: "var(--ep-accent)", transition: "width .25s ease" }} />
      </div>

      {complete && (
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "var(--ep-ok)", display: "flex", alignItems: "center", gap: 6 }}>
          <Check size={15} strokeWidth={3} /> {message}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{primary.map(row)}</div>

      {props.hasPlan && (
        <div style={{ marginTop: 14 }}>
          <p style={labelStyle}>{t("Diète suivie ?")}</p>
          <Chips
            label={t("Diète suivie ?")} value={null}
            options={[{ v: "oui", label: t("Oui, comme prévu") }, { v: "non", label: t("Non, autrement") }]}
            onPick={(v) => {
              if (v === "oui") void save({}, { diet_followed: "oui" });
              else window.location.href = props.trackerHref ?? "/dashboard/client/nutrition";
            }}
          />
        </div>
      )}

      {(details.length > 0 || props.allowQuick) && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {props.allowQuick && (
            <button type="button" onClick={toggleQuick} style={{ background: "none", border: "none", textAlign: "left", fontSize: 12, fontWeight: 800, color: "var(--ep-accent)", cursor: "pointer", minHeight: 36, padding: 0 }}>
              {quick ? t("Afficher tout le bilan") : t("Version rapide : 3 infos")}
            </button>
          )}
          {details.length > 0 && (
            <details>
              <summary style={{ listStyle: "none", cursor: "pointer", minHeight: 36, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color: "rgba(var(--ep-ink-rgb),0.55)" }}>
                {t("Plus de détails")} <ChevronDown size={14} />
              </summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>{details.map(row)}</div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      {children}
      {hint && <p style={{ margin: "5px 0 0", fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.4)" }}>{hint}</p>}
    </div>
  );
}

function Scale({ low, high }: { low: string; high: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(var(--ep-ink-rgb),0.35)", marginTop: 3 }}>
      <span>{low}</span><span>{high}</span>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ flex: 1, fontSize: 10, color: "rgba(var(--ep-ink-rgb),0.45)" }}>
      {label}
      <input type="time" defaultValue={value} onBlur={(e) => e.target.value && onChange(e.target.value)} style={{ ...chipBase, width: "100%", marginTop: 3, fontSize: 15 }} />
    </label>
  );
}

function NumField({ label, value, min, max, onChange }: { label: string; value: number | null; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label style={{ flex: 1, fontSize: 10, color: "rgba(var(--ep-ink-rgb),0.45)" }}>
      {label}
      <input
        type="number" inputMode="numeric" defaultValue={value ?? ""} min={min} max={max}
        onBlur={(e) => { const n = Number(e.target.value); if (e.target.value && n >= min && n <= max) onChange(n); }}
        style={{ ...chipBase, width: "100%", marginTop: 3, fontSize: 15 }}
      />
    </label>
  );
}

