"use client";

// Briques communes des cartes de Paramètres : interrupteur, ligne de
// réglage et choix en pastilles, pour que toutes les cartes se ressemblent.

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        flexShrink: 0, width: 44, height: 26, borderRadius: 999, border: "none", cursor: disabled ? "default" : "pointer",
        background: on ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.15)", position: "relative", transition: "background 0.15s ease",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "var(--ep-bg)", transition: "left 0.15s ease" }} />
    </button>
  );
}

export function SettingRow({ icon: Icon, title, hint, children, active }: { icon: React.ElementType; title: string; hint?: string; children?: React.ReactNode; active?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
      <Icon size={18} style={{ color: active === false ? "rgba(var(--ep-ink-rgb),0.4)" : "var(--ep-accent)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--ep-ink)" }}>{title}</p>
        {hint && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.45)", lineHeight: 1.45 }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: "rgba(var(--ep-ink-rgb),0.06)" }} />;
}

export function ChoiceChips<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className="ep-press"
            style={{
              padding: "8px 12px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
              background: active ? "rgba(var(--ep-accent-rgb),0.16)" : "rgba(var(--ep-ink-rgb),0.04)",
              border: active ? "1px solid rgba(var(--ep-accent-rgb),0.6)" : "1px solid rgba(var(--ep-ink-rgb),0.08)",
              color: active ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.65)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ep-card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
      {children}
    </div>
  );
}
