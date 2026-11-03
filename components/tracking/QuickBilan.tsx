"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { changedFields, fieldFilled, formatHours, parseDecimal, parseHours } from "@/lib/bilan-quick";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import type { BilanField } from "@/lib/tracking-profile";
import type { DailyLog } from "@/utils/daily-logs";

// Bilan du jour en un seul écran, pensé pour moins de 20 secondes. Seuls les
// champs que le moteur de tracking juge utiles à cette personne sont affichés
// (lib/tracking-profile.ts), le reste sous « Plus de détails ».
//
// 03/11/2026 (retour d'Emmanuel) : plus d'enregistrement à chaque tap. Les
// réponses restent en brouillon, se tapent au clavier (poids, sommeil « 7h30 »)
// ou s'ajustent avec − / +, et partent en un seul envoi avec le bouton
// « Enregistrer le bilan ». La dernière valeur connue n'est plus pré-remplie
// en douce : « Reprendre … » la reprend d'un tap.

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

/**
 * Champ numérique : on tape la valeur au clavier, ou on ajuste avec − / +.
 * Rien ne part au serveur ici : la valeur reste en brouillon jusqu'au bouton
 * « Enregistrer le bilan ». La dernière valeur connue est proposée à part
 * (« Reprendre … »), jamais comptée comme saisie sans un tap.
 */
function NumberInput({
  value, onChange, parse, format, editFormat, step, min, max, unit, label, suggestion, inputMode = "decimal", placeholder,
}: {
  value: number | null; onChange: (n: number | null) => void; parse: (raw: string) => number | null;
  format: (n: number) => string; editFormat?: (n: number) => string; step: number; min: number; max: number; unit: string; label: string;
  suggestion?: number | null; inputMode?: "decimal" | "numeric" | "text"; placeholder?: string;
}) {
  const t = useT();
  const [text, setText] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const decimals = String(step).split(".")[1]?.length ?? 0;
  const clamp = (n: number) => Math.min(max, Math.max(min, Number(n.toFixed(decimals))));
  const edit = editFormat ?? format;

  function typed(raw: string) {
    setText(raw);
    if (raw.trim() === "") { setInvalid(false); onChange(null); return; }
    const n = parse(raw);
    const ok = n != null && n >= min && n <= max;
    setInvalid(!ok);
    if (ok) onChange(n);
  }
  function bump(delta: number) {
    const base = value ?? suggestion ?? null;
    if (base == null) return; // rien de connu : on tape la valeur
    const next = clamp(base + delta);
    setText(null);
    setInvalid(false);
    onChange(next);
  }
  const shown = text ?? (value == null ? "" : format(value));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={() => bump(-step)} aria-label={`${label} −`} style={{ ...chipBase, flex: "0 0 48px", minHeight: 48 }}><Minus size={18} /></button>
        <label style={{ flex: 1, position: "relative", display: "block" }}>
          <span className="sr-only">{label}</span>
          <input
            type="text" inputMode={inputMode} enterKeyHint="done" autoComplete="off"
            value={shown}
            placeholder={placeholder ?? (suggestion != null ? format(suggestion) : "")}
            onFocus={(e) => { setText(value == null ? "" : edit(value)); requestAnimationFrame(() => e.target.select()); }}
            onChange={(e) => typed(e.target.value)}
            onBlur={() => { setText(null); setInvalid(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            aria-invalid={invalid}
            style={{
              width: "100%", minHeight: 48, borderRadius: 12, textAlign: "center", fontSize: 22, fontWeight: 900,
              fontVariantNumeric: "tabular-nums", color: "var(--ep-ink)", background: "rgba(var(--ep-shade-rgb),0.3)",
              border: `1px solid ${invalid ? "var(--ep-bad)" : "rgba(var(--ep-line-rgb),0.3)"}`, padding: unit ? "0 34px 0 8px" : "0 8px",
            }}
          />
          {unit && <span aria-hidden style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.45)", pointerEvents: "none" }}>{unit}</span>}
        </label>
        <button type="button" onClick={() => bump(step)} aria-label={`${label} +`} style={{ ...chipBase, flex: "0 0 48px", minHeight: 48 }}><Plus size={18} /></button>
      </div>
      {value == null && suggestion != null && (
        <button type="button" onClick={() => onChange(suggestion)} style={{ marginTop: 6, background: "none", border: "none", padding: "4px 0", minHeight: 32, cursor: "pointer", fontSize: 12, fontWeight: 800, color: "var(--ep-accent)" }}>
          {t("Reprendre")} {format(suggestion)}{unit ? ` ${unit}` : ""}
        </button>
      )}
      {invalid && <p role="alert" style={{ margin: "5px 0 0", fontSize: 11, color: "var(--ep-bad)" }}>{t("Valeur non reconnue")}</p>}
    </div>
  );
}

const TRI = [{ v: "low", label: "Bas" }, { v: "medium", label: "Moyen" }, { v: "high", label: "Haut" }];

export default function QuickBilan(props: QuickBilanProps) {
  const t = useT();
  const { today, existing, action, minimum } = props;
  // Ce qui est en base / ce que la personne est en train de remplir. Rien ne
  // part tant qu'elle n'a pas appuyé sur « Enregistrer le bilan ».
  const [saved, setSaved] = useState<Partial<DailyLog>>(existing ?? {});
  const [log, setLog] = useState<Partial<DailyLog>>(existing ?? {});
  const [diet, setDiet] = useState<"oui" | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
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

  const needsWeigh = primary.includes("poids") && (props.isWeighDay || weighAnyway || existing?.weight_morning != null);
  const required = primary.filter((f) => (f === "poids" ? needsWeigh : true));
  const doneCount = required.filter((f) => fieldFilled(f, log)).length;
  const complete = required.length > 0 && doneCount === required.length;
  const savedComplete = required.length > 0 && required.every((f) => fieldFilled(f, saved));
  const changes = changedFields(saved as Record<string, unknown>, log as Record<string, unknown>);
  const dirty = Object.keys(changes).length > 0 || diet !== null;

  // Saisie non enregistrée : le navigateur prévient avant de quitter la page.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function put(patch: Partial<DailyLog>) {
    setLog((l) => ({ ...l, ...patch }));
    if (status !== "saving") setStatus("idle");
  }

  /** Un seul envoi avec tout ce qui a changé. Bilan complet : points et coach prévenu, une fois. */
  async function save(): Promise<boolean> {
    if (!dirty || status === "saving") return true;
    const fd = new FormData();
    fd.set("log_date", today);
    for (const [k, v] of Object.entries(changes)) fd.set(k, v == null ? "" : String(v));
    if ("weight_morning" in changes && changes.weight_morning != null) fd.set("weight_time", new Date().toTimeString().slice(0, 5));
    if (diet) fd.set("diet_followed", diet);
    const finishing = complete && !doneSent.current && !savedComplete;
    if (!finishing) fd.set("autosave", "1");
    setStatus("saving");
    setErrorText(null);
    try {
      const res = await action(null, fd);
      if (res.error) { setStatus("error"); setErrorText(res.error); return false; }
      if (finishing) doneSent.current = true;
      setSaved(log);
      setDiet(null);
      setStatus("saved");
      return true;
    } catch {
      setStatus("error");
      setErrorText(t("Connexion perdue, réessaie."));
      return false;
    }
  }

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
          <Row key={f} label={t("Poids à jeun")}>
            <NumberInput
              label={t("Poids")} value={log.weight_morning ?? null} suggestion={props.lastWeight} step={0.1} min={30} max={300} unit="kg"
              parse={parseDecimal} format={(n) => n.toFixed(1).replace(".", ",")} editFormat={(n) => String(n).replace(".", ",")}
              onChange={(n) => put({ weight_morning: n })}
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
          <Row key={f} label={t("Pas")} hint={log.steps == null && props.autoSteps != null ? t("Comptés automatiquement : « Reprendre » pour les garder") : undefined}>
            <NumberInput
              label={t("Pas")} value={log.steps ?? null} suggestion={props.autoSteps} step={500} min={0} max={100000} unit="" inputMode="numeric"
              parse={(raw) => { const n = parseDecimal(raw.replace(/[\s.]/g, "")); return n == null ? null : Math.round(n); }}
              format={(n) => n.toLocaleString("fr-FR")} editFormat={(n) => String(n)} onChange={(n) => put({ steps: n })}
            />
          </Row>
        );
      case "sommeil":
        return (
          <Row key={f} label={t("Sommeil")} hint={t("Tape par exemple 7h30 ou 7,5")}>
            <NumberInput
              label={t("Sommeil")} value={log.sleep_hours ?? null} suggestion={props.lastSleep} step={0.25} min={0} max={16} unit="" inputMode="text"
              parse={parseHours} format={formatHours} editFormat={(n) => formatHours(n).replace(/\s/g, "")} placeholder={t("ex. 7h30")}
              onChange={(n) => put({ sleep_hours: n })}
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
            <NumberInput label={t("Eau")} value={log.water_l ?? null} step={0.25} min={0} max={15} unit="L" parse={parseDecimal} format={(n) => String(n).replace(".", ",")} onChange={(n) => put({ water_l: n })} placeholder="2" />
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
              <TimeField label={t("Coucher (hier soir)")} value={log.bedtime_actual?.slice(0, 5) ?? ""} onChange={(v) => put({ bedtime_actual: v || null })} />
              <TimeField label={t("Lever (ce matin)")} value={log.wake_time_actual?.slice(0, 5) ?? ""} onChange={(v) => put({ wake_time_actual: v || null })} />
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
  const saveLabel = status === "saving" ? t("Enregistrement…")
    : dirty ? (complete ? t("Enregistrer le bilan") : t("Enregistrer pour l'instant"))
    : status === "saved" ? t("Enregistré") : t("Rien à enregistrer");

  return (
    <section className="ep-card" aria-label={t("Bilan du jour")} style={{ padding: "14px 14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <p style={{ ...labelStyle, margin: 0, flex: 1 }}>{t("Bilan du jour")}</p>
        {dirty && status !== "saving" && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--ep-warn, #d97706)" }}>{t("Non enregistré")}</span>}
        <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(var(--ep-ink-rgb),0.45)" }}>{doneCount}/{required.length}</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: "rgba(var(--ep-ink-rgb),0.07)", marginBottom: 12, overflow: "hidden" }}>
        <div style={{ width: `${required.length ? (doneCount / required.length) * 100 : 0}%`, height: "100%", background: "var(--ep-accent)", transition: "width .25s ease" }} />
      </div>

      {savedComplete && !dirty && (
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "var(--ep-ok)", display: "flex", alignItems: "center", gap: 6 }}>
          <Check size={15} strokeWidth={3} /> {message}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{primary.map(row)}</div>

      {props.hasPlan && (
        <div style={{ marginTop: 14 }}>
          <p style={labelStyle}>{t("Diète suivie ?")}</p>
          <Chips
            label={t("Diète suivie ?")} value={diet}
            options={[{ v: "oui", label: t("Oui, comme prévu") }, { v: "non", label: t("Non, autrement") }]}
            onPick={async (v) => {
              if (v === "oui") { setDiet(diet === "oui" ? null : "oui"); return; }
              // Ce qui est déjà rempli est enregistré avant d'aller au tracker.
              if (await save()) window.location.href = props.trackerHref ?? "/dashboard/client/nutrition";
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

      <button
        type="button" onClick={() => void save()} disabled={!dirty || status === "saving"}
        style={{
          marginTop: 14, width: "100%", minHeight: 50, borderRadius: 14, fontSize: 15, fontWeight: 900, cursor: dirty ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background .2s ease, color .2s ease",
          ...(dirty
            ? { background: "var(--ep-accent)", color: "var(--ep-strong)", border: "1px solid var(--ep-accent)" }
            : { background: "rgba(var(--ep-ok-rgb),0.1)", color: status === "saved" ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.4)", border: "1px solid rgba(var(--ep-line-rgb),0.25)" }),
        }}
      >
        {!dirty && status === "saved" && <Check size={17} strokeWidth={3} />}
        {saveLabel}
      </button>
      <p aria-live="polite" style={{ margin: errorText ? "6px 0 0" : 0, fontSize: 12, fontWeight: 700, color: "var(--ep-bad)", textAlign: "center" }}>
        {status === "error" ? errorText ?? t("Erreur, réessaie") : ""}
      </p>
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
      <input type="time" defaultValue={value} onChange={(e) => onChange(e.target.value)} style={{ ...chipBase, width: "100%", marginTop: 3, fontSize: 15 }} />
    </label>
  );
}

function NumField({ label, value, min, max, onChange }: { label: string; value: number | null; min: number; max: number; onChange: (v: number | null) => void }) {
  return (
    <label style={{ flex: 1, fontSize: 10, color: "rgba(var(--ep-ink-rgb),0.45)" }}>
      {label}
      <input
        type="number" inputMode="numeric" defaultValue={value ?? ""} min={min} max={max}
        onChange={(e) => { const raw = e.target.value; if (!raw) { onChange(null); return; } const n = Number(raw); if (n >= min && n <= max) onChange(n); }}
        style={{ ...chipBase, width: "100%", marginTop: 3, fontSize: 15 }}
      />
    </label>
  );
}

