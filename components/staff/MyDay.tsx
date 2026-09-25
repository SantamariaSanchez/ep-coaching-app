import Link from "next/link";
import { Clock, CalendarCheck, NotebookPen, Repeat, ChevronRight, AlertCircle } from "lucide-react";
import type { Playbook } from "@/lib/staff-playbooks";
import { MODULES } from "@/lib/staff-roles";
import type { NextAction } from "@/lib/staff-next-actions";

const PRIORITY_COLOR: Record<NextAction["priority"], string> = {
  1: "#f87171",
  2: "#facc15",
  3: "rgba(245,237,237,0.45)",
};
const PRIORITY_LABEL: Record<NextAction["priority"], string> = { 1: "Maintenant", 2: "Aujourd'hui", 3: "Quand tu peux" };

export function NextActions({ actions }: { actions: NextAction[] }) {
  return (
    <section className="ep-card" style={{ padding: "15px 16px" }}>
      <p className="ep-label" style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <AlertCircle size={12} /> Tes prochaines actions
      </p>
      {actions.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "#4ade80", margin: 0 }}>Rien en attente. Avance sur ta routine.</p>
      ) : (
        actions.map((a) => (
          <Link
            key={a.id}
            href={a.href}
            style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", borderTop: "1px solid rgba(245,237,237,0.05)", textDecoration: "none" }}
          >
            <span style={{ flexShrink: 0, marginTop: 2, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: PRIORITY_COLOR[a.priority], border: `1px solid ${PRIORITY_COLOR[a.priority]}55`, borderRadius: 999, padding: "2px 7px", minWidth: 78, textAlign: "center" }}>
              {PRIORITY_LABEL[a.priority]}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#F5EDED", lineHeight: 1.4 }}>{a.title}</span>
              {a.detail && <span style={{ display: "block", fontSize: 11.5, color: "rgba(245,237,237,0.5)", lineHeight: 1.5, whiteSpace: "pre-line" }}>{a.detail}</span>}
            </span>
            <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.25)", flexShrink: 0, marginTop: 3 }} />
          </Link>
        ))
      )}
    </section>
  );
}

export function MyDay({ playbook, hhmm, isoDow }: { playbook: Playbook; hhmm: string; isoDow: number }) {
  const weekend = isoDow > 5;
  const current = weekend ? null : playbook.routine.find((b) => b.start <= hhmm && hhmm < b.end) ?? null;
  const next = weekend ? null : playbook.routine.find((b) => b.start > hhmm) ?? null;
  const rituals = playbook.rituals.filter((r) => r.day === isoDow);
  const focus = current ?? next;

  return (
    <section className="ep-card-hero" style={{ padding: "16px 17px" }}>
      <p className="ep-label" style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
        <Clock size={12} /> {weekend ? "Week-end" : current ? "En ce moment" : next ? `Ensuite, à ${next.start}` : "Journée terminée"}
      </p>
      {weekend ? (
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.65)", margin: 0, lineHeight: 1.6 }}>
          Pas de routine le week-end. Tes actions en attente restent listées à côté si tu veux prendre de l&apos;avance.
        </p>
      ) : focus ? (
        <>
          <p style={{ fontSize: 17, fontWeight: 900, color: "#F5EDED", margin: "0 0 4px" }}>
            {focus.title} <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(245,237,237,0.45)" }}>{focus.start} à {focus.end}</span>
          </p>
          <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.65)", margin: "0 0 10px", lineHeight: 1.6 }}>{focus.detail}</p>
          {focus.href && (
            <Link href={focus.href} className="ep-btn-primary" style={{ height: 36, padding: "0 14px", fontSize: 11, textDecoration: "none", display: "inline-flex" }}>
              Y aller
            </Link>
          )}
        </>
      ) : (
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.65)", margin: 0 }}>Ta routine du jour est terminée. Pense à ton rapport si ce n&apos;est pas fait.</p>
      )}

      {!weekend && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 2 }}>
          {playbook.routine.map((b) => {
            const done = b.end <= hhmm;
            const active = current === b;
            return (
              <div key={`${b.start}-${b.title}`} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "4px 0", opacity: done && !active ? 0.4 : 1 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: active ? "#E01E1E" : "rgba(245,237,237,0.5)", minWidth: 42 }}>{b.start}</span>
                <span style={{ fontSize: 12.5, color: active ? "#F5EDED" : "rgba(245,237,237,0.7)", fontWeight: active ? 800 : 600, textDecoration: done && !active ? "line-through" : undefined }}>{b.title}</span>
              </div>
            );
          })}
        </div>
      )}

      {rituals.length > 0 && (
        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.2)" }}>
          {rituals.map((r) => (
            <p key={r.title} style={{ fontSize: 12, color: "rgba(245,237,237,0.75)", margin: 0, lineHeight: 1.55 }}>
              <Repeat size={11} style={{ display: "inline", marginRight: 6, color: "#facc15", verticalAlign: "-1px" }} />
              <strong style={{ color: "#facc15" }}>Rituel du jour : {r.title}.</strong> {r.detail}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

export function LoggingGuide({ playbook }: { playbook: Playbook }) {
  return (
    <details className="ep-card" style={{ padding: "13px 16px" }}>
      <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
        <NotebookPen size={12} style={{ color: "#E01E1E" }} />
        <span className="ep-label" style={{ margin: 0 }}>Quoi noter, et quand</span>
      </summary>
      <div style={{ marginTop: 10 }}>
        {playbook.logRules.map((r) => (
          <Link key={r.when} href={`/equipe/${r.where}`} style={{ display: "block", padding: "8px 0", borderTop: "1px solid rgba(245,237,237,0.05)", textDecoration: "none" }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#F5EDED" }}>
              {r.when} <span style={{ fontWeight: 600, color: "rgba(245,237,237,0.4)" }}>· {MODULES[r.where].label}</span>
            </span>
            <span style={{ display: "block", fontSize: 12, color: "rgba(245,237,237,0.6)", lineHeight: 1.55 }}>{r.what}</span>
          </Link>
        ))}
        <p style={{ fontSize: 11, color: "rgba(245,237,237,0.35)", margin: "8px 0 0", display: "flex", gap: 6, alignItems: "center" }}>
          <CalendarCheck size={11} /> Rituels de la semaine : {playbook.rituals.map((r) => `${["", "lundi", "mardi", "mercredi", "jeudi", "vendredi"][r.day]} ${r.title.toLowerCase()}`).join(", ")}.
        </p>
      </div>
    </details>
  );
}
