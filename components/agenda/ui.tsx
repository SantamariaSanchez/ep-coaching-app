"use client";

// Petites briques d'interface communes aux panneaux de l'agenda (création
// rapide, fiche d'un bloc, « Construire ma semaine », réglages, journées
// types). Couleurs : variables de thème uniquement.

import { useT } from "@/components/i18n/I18nProvider";
import { ALL_DAYS, DAY_SHORT, WEEK_DAYS } from "@/lib/agenda-engine";

export function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[10px] font-black uppercase tracking-widest text-(--ep-ink)/45 mb-2 ${className}`}>{children}</p>;
}

export function Chip({
  active,
  onClick,
  children,
  disabled,
  title,
  tone = "accent",
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
  tone?: "accent" | "ok" | "info" | "warn";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg text-xs font-bold border transition-colors disabled:opacity-35"
      style={{
        background: active ? `rgba(var(--ep-${tone}-rgb),0.16)` : "transparent",
        borderColor: active ? `rgba(var(--ep-${tone}-rgb),0.6)` : "rgba(var(--ep-line-rgb),0.3)",
        color: active ? "var(--ep-strong)" : "rgba(var(--ep-ink-rgb),0.62)",
      }}
    >
      {children}
    </button>
  );
}

/** Choix de jours avec raccourcis « Lun–Ven », « Week-end », « Tous ». */
export function DayPicker({
  value,
  onChange,
  exclude,
  shortcuts = true,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  exclude?: number;
  shortcuts?: boolean;
}) {
  const t = useT();
  const days = ALL_DAYS.filter((d) => d !== exclude);
  const set = (list: number[]) => onChange(list.filter((d) => d !== exclude));
  const same = (list: number[]) => {
    const l = list.filter((d) => d !== exclude);
    return l.length === value.length && l.every((d) => value.includes(d));
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const on = value.includes(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())}
              className="h-9 rounded-lg text-[11px] font-black border transition-colors"
              style={{
                background: on ? "rgba(var(--ep-accent-rgb),0.18)" : "transparent",
                borderColor: on ? "rgba(var(--ep-accent-rgb),0.6)" : "rgba(var(--ep-line-rgb),0.3)",
                color: on ? "var(--ep-strong)" : "rgba(var(--ep-ink-rgb),0.55)",
              }}
            >
              {DAY_SHORT[d]}
            </button>
          );
        })}
      </div>
      {shortcuts && (
        <div className="flex flex-wrap gap-1.5">
          <Chip active={same(WEEK_DAYS)} onClick={() => set(WEEK_DAYS)}>{t("Lun → Ven")}</Chip>
          <Chip active={same([6, 7])} onClick={() => set([6, 7])}>{t("Week-end")}</Chip>
          <Chip active={same(ALL_DAYS)} onClick={() => set(ALL_DAYS)}>{t("Tous les jours")}</Chip>
        </div>
      )}
    </div>
  );
}

export function ToggleRow({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex items-center justify-between gap-3 w-full rounded-xl px-3 py-2.5 border text-left transition-colors"
      style={{ borderColor: on ? "rgba(var(--ep-ok-rgb),0.45)" : "rgba(var(--ep-line-rgb),0.3)", background: on ? "rgba(var(--ep-ok-rgb),0.07)" : "transparent" }}
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold text-(--ep-strong)">{label}</span>
        {hint && <span className="block text-[11px] text-(--ep-ink)/45 leading-snug mt-0.5">{hint}</span>}
      </span>
      <span className="relative flex-shrink-0 rounded-full transition-colors" style={{ width: 36, height: 20, background: on ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.18)" }}>
        <span className="absolute rounded-full transition-all" style={{ top: 2, left: on ? 18 : 2, width: 16, height: 16, background: "var(--ep-bg)" }} />
      </span>
    </button>
  );
}

export function PrimaryButton({ children, onClick, disabled, danger, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; danger?: boolean; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest py-3 transition-opacity disabled:opacity-45"
      style={{ background: danger ? "var(--ep-bad)" : "var(--ep-accent)", color: danger ? "var(--ep-bg)" : "var(--ep-strong)" }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 rounded-xl border border-(--ep-line)/40 text-(--ep-ink)/80 text-xs font-bold uppercase tracking-widest py-3 disabled:opacity-45"
    >
      {children}
    </button>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="text-xs mt-2" style={{ color: "var(--ep-bad)" }}>{children}</p>;
}

/** Sélecteur d'heure par pas de 15 / 30 min (plus rapide qu'un champ libre au pouce). */
export function TimeSelect({ value, onChange, step = 30, label, allowMidnightEnd }: { value: number; onChange: (min: number) => void; step?: number; label: string; allowMidnightEnd?: boolean }) {
  const options: number[] = [];
  for (let m = 0; m < 1440; m += step) options.push(m);
  if (allowMidnightEnd) options.push(1440);
  if (!options.includes(value)) options.push(value);
  options.sort((a, b) => a - b);
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-3 py-2.5 text-sm font-bold text-(--ep-strong) outline-none"
    >
      {options.map((m) => (
        <option key={m} value={m}>
          {String(Math.floor(m / 60) % 24).padStart(2, "0")}:{String(m % 60).padStart(2, "0")}
          {m === 1440 ? " (minuit)" : ""}
        </option>
      ))}
    </select>
  );
}
