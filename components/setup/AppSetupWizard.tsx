"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { COACH_QUESTIONS, MEMBER_QUESTIONS, type SetupQuestion } from "@/lib/app-setup";
import { saveAppSetupAction } from "@/app/actions/app-setup";

// Questionnaire "Mon appli" : une question par écran, de gros choix faciles
// à toucher. Côté coach, les questions coach puis (s'il se suit lui-même)
// celles de son espace Moi.
export default function AppSetupWizard({ role, initialAnswers, doneHref }: { role: "coach" | "client"; initialAnswers: Record<string, unknown>; doneHref: string }) {
  const t = useT();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [index, setIndex] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const questions = useMemo<SetupQuestion[]>(() => {
    const base = role === "coach" ? [...COACH_QUESTIONS, ...(answers.suivi_perso === "non" ? [] : MEMBER_QUESTIONS)] : MEMBER_QUESTIONS;
    return base.filter((q) => !q.showIf || q.showIf(answers));
  }, [role, answers]);

  const q = questions[Math.min(index, questions.length - 1)];
  const value = answers[q.key];
  const selected: string[] = Array.isArray(value) ? (value as string[]) : typeof value === "string" ? [value] : [];
  const isLast = index >= questions.length - 1;
  const canNext = q.multi ? true : selected.length === 1;

  function toggle(v: string) {
    setAnswers((prev) => {
      if (!q.multi) return { ...prev, [q.key]: v };
      const cur = Array.isArray(prev[q.key]) ? (prev[q.key] as string[]) : [];
      return { ...prev, [q.key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });
  }

  function next() {
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    setError(null);
    start(async () => {
      const res = await saveAppSetupAction(answers);
      if (res.error) return setError(res.error);
      router.push(doneHref);
      router.refresh();
    });
  }

  return (
    <div className="ep-card-hero" style={{ padding: "22px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p className="ep-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={12} />{" "}{t("Mon appli")}
        </p>
        <span style={{ fontSize: 11, color: "rgba(245,237,237,0.45)" }}>
          {Math.min(index, questions.length - 1) + 1} / {questions.length}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: "rgba(245,237,237,0.07)", marginBottom: 18 }}>
        <div style={{ width: `${((Math.min(index, questions.length - 1) + 1) / questions.length) * 100}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #890404, #E01E1E)", transition: "width .3s ease" }} />
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 900, color: "#F5EDED", margin: "0 0 4px", lineHeight: 1.25 }}>{t(q.title)}</h2>
      {q.subtitle && <p style={{ fontSize: 13, color: "rgba(245,237,237,0.55)", margin: "0 0 14px" }}>{t(q.subtitle)}</p>}
      <p style={{ fontSize: 11, color: "rgba(245,237,237,0.35)", margin: "0 0 10px" }}>{q.multi ? t("Plusieurs choix possibles") : t("Un seul choix")}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              style={{
                display: "flex", alignItems: "center", gap: 12, textAlign: "left", padding: "13px 14px", borderRadius: 14, cursor: "pointer",
                border: `1px solid ${on ? "rgba(224,30,30,0.7)" : "rgba(137,4,4,0.35)"}`,
                background: on ? "rgba(224,30,30,0.14)" : "rgba(0,0,0,0.25)",
              }}
            >
              <span style={{ width: 22, height: 22, borderRadius: q.multi ? 7 : 99, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${on ? "#E01E1E" : "rgba(245,237,237,0.3)"}`, background: on ? "#E01E1E" : "transparent" }}>
                {on && <Check size={13} color="#fff" strokeWidth={3} />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#F5EDED" }}>{t(o.label)}</span>
                {o.hint && <span style={{ display: "block", fontSize: 11.5, color: "rgba(245,237,237,0.45)", marginTop: 2 }}>{t(o.hint)}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p style={{ fontSize: 12, color: "#fca5a5", margin: "12px 0 0" }}>{t(error)}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        {index > 0 && (
          <button type="button" onClick={() => setIndex((i) => i - 1)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(137,4,4,0.45)", background: "transparent", color: "rgba(245,237,237,0.7)", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            <ChevronLeft size={14} />{" "}{t("Retour")}
          </button>
        )}
        <button
          type="button"
          disabled={!canNext || pending}
          onClick={next}
          style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 14px", borderRadius: 12, border: "none", background: "#E01E1E", color: "#fff", fontSize: 12.5, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", opacity: !canNext || pending ? 0.5 : 1 }}
        >
          {pending ? "..." : isLast ? t("Terminer") : t("Suivant")} {!pending && !isLast && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}
