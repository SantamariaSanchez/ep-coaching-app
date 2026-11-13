"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Mic, Check, ChevronDown, Sparkles } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { WEEKLY_QUESTIONS, type WeeklyAnswers } from "@/lib/lived-content";
import { saveWeeklyLivedAction, livedNotesToIdeasAction } from "@/app/actions/lived";

type SpeechRec = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

// « Qu'est-ce qui s'est passé cette semaine ? » : 4 questions courtes, texte ou
// voix, une fois par semaine. Les réponses deviennent une note #vécu, seule
// matière autorisée pour les contenus storytelling (rien n'est inventé).
// Repliée quand la semaine est déjà racontée, ouverte sinon.
export default function WeeklyLivedCard({ doneThisWeek, livedCount, pendingIdeas }: { doneThisWeek: boolean; livedCount: number; pendingIdeas: number }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<WeeklyAnswers>({});
  const [listeningId, setListeningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const recRef = useRef<SpeechRec | null>(null);

  const filled = WEEKLY_QUESTIONS.some((q) => (answers[q.id] ?? "").trim());

  function dictate(id: string) {
    if (listeningId) {
      recRef.current?.stop();
      if (listeningId === id) return;
    }
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return setError(t("La dictée n'est pas disponible sur ce navigateur. Utilise le micro du clavier de ton téléphone."));
    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text) setAnswers((a) => ({ ...a, [id]: a[id] ? `${a[id].trimEnd()} ${text.trim()}` : text.trim() }));
    };
    rec.onend = () => setListeningId(null);
    rec.onerror = () => setListeningId(null);
    recRef.current = rec;
    rec.start();
    setListeningId(id);
  }

  function save() {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await saveWeeklyLivedAction(answers);
      if (res.error) return setError(t(res.error));
      setAnswers({});
      setMessage(t("Noté ✓ Ta semaine est rangée dans tes notes (#vécu)."));
      setOpen(false);
      router.refresh();
    });
  }

  function toIdeas() {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await livedNotesToIdeasAction();
      if (res.error) return setError(t(res.error));
      setMessage(res.created ? `${res.created} ${t("idée(s) storytelling ajoutée(s) dans tes idées.")}` : t("Rien de nouveau : tout ton vécu est déjà en idées."));
      router.refresh();
    });
  }

  // Petit bouton discret (audit 2026-11-13) ; les questions s'ouvrent en
  // panneau par-dessus au lieu de prendre toute la page.
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "0 12px", marginBottom: 12, borderRadius: 999, border: "1px solid rgba(var(--ep-line-rgb),0.35)", background: "transparent", color: "var(--ep-ink)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
      >
        {doneThisWeek ? <Check size={14} style={{ color: "var(--ep-violet)" }} /> : <BookOpen size={14} style={{ color: "var(--ep-violet)" }} />}
        {t("Ma semaine")}
      </button>
      {message && !open && <p role="status" style={{ margin: "-6px 0 10px", fontSize: 12, color: "var(--ep-violet)" }}>{message}</p>}
      {open && (
      <div role="dialog" aria-modal="true" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <section className="ep-card" onClick={(e) => e.stopPropagation()} style={{ padding: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", borderRadius: "18px 18px 0 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 900 }}>{t("Ma semaine")}</span>
        <button type="button" onClick={() => setOpen(false)} aria-label={t("Fermer")} style={{ background: "none", border: "none", color: "var(--ep-ink)", cursor: "pointer", padding: 6 }}><ChevronDown size={18} /></button>
      </div>
      {open && (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {WEEKLY_QUESTIONS.map((q) => (
            <label key={q.id} style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{t(q.label)}</span>
              <span style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder={t(q.placeholder)}
                  rows={2}
                  style={{ flex: 1, minWidth: 0, resize: "vertical", borderRadius: 10, border: "1px solid rgba(var(--ep-ink-rgb),0.12)", background: "transparent", color: "var(--ep-ink)", padding: "8px 10px", fontSize: 14 }}
                />
                <button type="button" onClick={() => dictate(q.id)} aria-label={t("Dicter ma réponse")} style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 999, border: "none", cursor: "pointer", background: listeningId === q.id ? "#F06060" : "rgba(var(--ep-ink-rgb),0.07)", color: listeningId === q.id ? "#fff" : "var(--ep-ink)" }}>
                  <Mic size={16} />
                </button>
              </span>
            </label>
          ))}
          <button type="button" onClick={save} disabled={!filled || pending} style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 999, border: "none", fontWeight: 800, fontSize: 13, cursor: filled ? "pointer" : "default", background: filled ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.07)", color: filled ? "#fff" : "rgba(var(--ep-ink-rgb),0.4)" }}>
            <Check size={15} /> {t("Enregistrer ma semaine")}
          </button>
        </div>
      )}

      {livedCount > 0 && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={toIdeas} disabled={pending} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999, border: "1px solid rgba(var(--ep-ink-rgb),0.15)", background: "transparent", color: "var(--ep-ink)", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
            <Sparkles size={14} /> {t("Transformer mon vécu en idées")}
          </button>
          <span style={{ fontSize: 11.5, opacity: 0.5 }}>{livedCount} {t("note(s) vécu")}{pendingIdeas > 0 ? ` · ${pendingIdeas} ${t("pas encore en idées")}` : ""}</span>
        </div>
      )}

      {message && <p role="status" style={{ marginTop: 8, fontSize: 12.5, color: "var(--ep-violet)" }}>{message}</p>}
      {error && <p role="alert" style={{ marginTop: 8, fontSize: 12.5, color: "#fca5a5" }}>{error}</p>}
      </section>
      </div>
      )}
    </>
  );
}
