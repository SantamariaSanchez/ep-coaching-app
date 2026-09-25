"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Clock, GraduationCap } from "lucide-react";
import { PHASES, type Lesson } from "@/lib/staff-training";
import { toggleLessonAction } from "@/app/equipe/team-actions";

export default function TrainingView({ lessons, done }: { lessons: Lesson[]; done: string[] }) {
  const router = useRouter();
  const [doneSet, setDoneSet] = useState(() => new Set(done));
  const [openKey, setOpenKey] = useState<string | null>(() => lessons.find((l) => !done.includes(l.key))?.key ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pct = lessons.length ? Math.round((doneSet.size / lessons.length) * 100) : 0;

  function toggle(key: string, value: boolean) {
    setError(null);
    setDoneSet((s) => {
      const n = new Set(s);
      if (value) n.add(key);
      else n.delete(key);
      return n;
    });
    startTransition(async () => {
      const r = await toggleLessonAction(key, value);
      if ("error" in r) {
        setError(r.error);
        setDoneSet((s) => {
          const n = new Set(s);
          if (value) n.delete(key);
          else n.add(key);
          return n;
        });
      } else {
        if (value) setOpenKey(lessons.find((l) => l.key !== key && !doneSet.has(l.key))?.key ?? null);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="ep-card-hero" style={{ padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <GraduationCap size={18} style={{ color: "#E01E1E" }} />
          <p style={{ fontSize: 15, fontWeight: 900, color: "#F5EDED", margin: 0 }}>
            {doneSet.size} leçon{doneSet.size > 1 ? "s" : ""} sur {lessons.length}
          </p>
          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: pct === 100 ? "#4ade80" : "#F5EDED" }}>{pct} %</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(224,30,30,0.1)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "linear-gradient(90deg,#4ade80,#22c55e)" : "linear-gradient(90deg,#890404,#E01E1E)" }} />
        </div>
        {error && <p role="alert" style={{ fontSize: 12, color: "#FDC4C4", margin: "10px 0 0" }}>{error}</p>}
      </div>

      {PHASES.map((phase) => {
        const list = lessons.filter((l) => l.phase === phase.key);
        if (list.length === 0) return null;
        const phaseDone = list.filter((l) => doneSet.has(l.key)).length;
        return (
          <section key={phase.key} style={{ marginBottom: 18 }}>
            <p className="ep-label" style={{ marginBottom: 8 }}>
              {phase.label} · {phase.when} · {phaseDone}/{list.length}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {list.map((l) => {
                const isDone = doneSet.has(l.key);
                const open = openKey === l.key;
                return (
                  <div key={l.key} className="ep-card" style={{ padding: "12px 15px", borderColor: isDone ? "rgba(74,222,128,0.25)" : undefined }}>
                    <button type="button" onClick={() => setOpenKey(open ? null : l.key)} aria-expanded={open} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                      {isDone ? <CheckCircle2 size={17} style={{ color: "#4ade80", flexShrink: 0 }} /> : <Circle size={17} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} />}
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800, color: "#F5EDED" }}>{l.title}</span>
                      <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Clock size={11} /> {l.minutes} min
                      </span>
                    </button>
                    {open && (
                      <div style={{ marginTop: 12, paddingLeft: 27 }}>
                        <ul style={{ margin: "0 0 12px", paddingLeft: 16 }}>
                          {l.points.map((p) => (
                            <li key={p} style={{ fontSize: 13, color: "rgba(245,237,237,0.78)", lineHeight: 1.65, marginBottom: 6 }}>{p}</li>
                          ))}
                        </ul>
                        {l.actions.length > 0 && (
                          <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(224,30,30,0.06)", border: "1px solid rgba(224,30,30,0.18)", marginBottom: 12 }}>
                            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#E01E1E", margin: "0 0 6px" }}>À faire</p>
                            {l.actions.map((a) => (
                              <p key={a} style={{ fontSize: 12.5, color: "#F5EDED", margin: "0 0 4px", lineHeight: 1.55 }}>{a}</p>
                            ))}
                          </div>
                        )}
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: isDone ? "#4ade80" : "#F5EDED" }}>
                          <input type="checkbox" checked={isDone} disabled={pending} onChange={(e) => toggle(l.key, e.target.checked)} style={{ width: 16, height: 16, accentColor: "#E01E1E" }} />
                          {isDone ? "Leçon terminée" : "J'ai terminé cette leçon"}
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
