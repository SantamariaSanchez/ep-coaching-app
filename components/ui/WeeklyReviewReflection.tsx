"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, PenLine } from "lucide-react";
import { saveWeeklyReflection } from "@/app/dashboard/client/semaine/actions";
import {
  parseReflectionContent,
  REFLECTION_FIELD_MAX,
  REFLECTION_FIELDS,
  type ReflectionAnswers,
  type WeeklyReflection,
} from "@/lib/weekly-review-helpers";

// Les 3 questions de recul de la revue de la semaine. Champs CONTRÔLÉS
// (pas de <form action>) : React 19 réinitialise les champs non contrôlés
// après chaque form action, ce qui effacerait les réponses en cas d'erreur
// d'enregistrement. Brouillon gardé en localStorage par semaine, pour ne
// rien perdre si l'appli est fermée en cours d'écriture.

const MOODS = [
  { value: 1, emoji: "😞", label: "Très dure" },
  { value: 2, emoji: "😕", label: "Difficile" },
  { value: 3, emoji: "😐", label: "Moyenne" },
  { value: 4, emoji: "🙂", label: "Bonne" },
  { value: 5, emoji: "😄", label: "Excellente" },
];

const PLACEHOLDERS: ReflectionAnswers = {
  victory: "Ex. 4 séances tenues malgré une semaine chargée",
  blocker: "Ex. couchers trop tardifs du mardi au jeudi",
  intention: "Ex. au lit avant minuit 5 soirs sur 7",
};

const EMPTY: ReflectionAnswers = { victory: "", blocker: "", intention: "" };

function draftKey(weekStart: string) {
  return `ep-weekly-review-draft-${weekStart}`;
}

export default function WeeklyReviewReflection({
  weekStart,
  existing,
}: {
  weekStart: string;
  existing: WeeklyReflection | null;
}) {
  const t = useT();
  const [editing, setEditing] = useState(!existing);
  const [answers, setAnswers] = useState<ReflectionAnswers>(() =>
    existing ? parseReflectionContent(existing.content) : EMPTY,
  );
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  // Dernière version enregistrée : c'est elle qu'on affiche en mode
  // lecture, et qu'on restaure si on annule une modification.
  const [savedVersion, setSavedVersion] = useState<{ answers: ReflectionAnswers; mood: number | null } | null>(() =>
    existing ? { answers: parseReflectionContent(existing.content), mood: existing.mood } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Brouillon relu APRÈS l'hydratation (localStorage n'existe pas côté
  // serveur : le lire pendant le rendu créerait un écart serveur/client).
  // Seulement quand aucune revue n'est encore enregistrée pour cette semaine.
  useEffect(() => {
    if (existing) return;
    try {
      const raw = window.localStorage.getItem(draftKey(weekStart));
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<ReflectionAnswers> & { mood?: number | null };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswers({
        victory: typeof draft.victory === "string" ? draft.victory : "",
        blocker: typeof draft.blocker === "string" ? draft.blocker : "",
        intention: typeof draft.intention === "string" ? draft.intention : "",
      });
      if (typeof draft.mood === "number") setMood(draft.mood);
    } catch {
      // Stockage indisponible (navigation privée...) : on repart de zéro.
    }
  }, [existing, weekStart]);

  function persistDraft(next: ReflectionAnswers, nextMood: number | null) {
    try {
      window.localStorage.setItem(draftKey(weekStart), JSON.stringify({ ...next, mood: nextMood }));
    } catch {
      // Pas de brouillon possible : la saisie reste en mémoire, rien de bloquant.
    }
  }

  function update(key: keyof ReflectionAnswers, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    persistDraft(next, mood);
  }

  function pickMood(value: number) {
    const next = mood === value ? null : value;
    setMood(next);
    persistDraft(answers, next);
  }

  function submit() {
    setError(null);
    if (Object.values(answers).every((v) => !v.trim())) {
      setError("Réponds au moins à une question.");
      return;
    }
    startTransition(async () => {
      const res = await saveWeeklyReflection({ weekStart, answers, mood });
      if (res.error) {
        setError(res.error);
        return;
      }
      try {
        window.localStorage.removeItem(draftKey(weekStart));
      } catch {
        // Brouillon orphelin sans conséquence : il est ignoré dès qu'une revue existe.
      }
      setSavedVersion({ answers, mood });
      setEditing(false);
    });
  }

  const hasSaved = savedVersion != null;

  if (!editing && savedVersion) {
    const shown = savedVersion.answers;
    const moodInfo = MOODS.find((m) => m.value === savedVersion.mood);
    return (
      <div className="ep-card" style={{ padding: "18px" }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={16} style={{ color: "#4ade80", flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#4ade80" }}>{t("Revue faite")}</p>
            {moodInfo && (
              <span title={`Semaine ${moodInfo.label.toLowerCase()}`} style={{ fontSize: 16 }}>
                {moodInfo.emoji}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ep-btn-secondary ep-press"
            style={{ padding: "8px 12px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
          >
            <PenLine size={12} />{" "}{t("Modifier")}
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {REFLECTION_FIELDS.map((f) =>
            shown[f.key].trim() ? (
              <div key={f.key}>
                <p className="ep-label" style={{ margin: "0 0 4px", color: "rgba(224,30,30,0.55)" }}>{f.label}</p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "rgba(245,237,237,0.78)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {shown[f.key]}
                </p>
              </div>
            ) : null,
          )}
        </div>
        <p style={{ margin: "14px 0 0", fontSize: 11, color: "rgba(245,237,237,0.3)" }}>
          {t("Enregistrée aussi dans ton journal Mindset.")}
        </p>
      </div>
    );
  }

  return (
    <div className="ep-card" style={{ padding: "18px" }}>
      <p className="ep-section-title" style={{ marginBottom: 4 }}>{t("Prends 2 minutes de recul")}</p>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "rgba(245,237,237,0.4)", lineHeight: 1.5 }}>
        {t("3 questions, réponds à celles qui te parlent. Ta revue est enregistrée dans ton journal Mindset.")}
      </p>

      <div className="flex flex-col gap-4">
        {REFLECTION_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="ep-label" style={{ display: "block", marginBottom: 6 }}>{f.label}</span>
            <textarea
              className="ep-input"
              rows={3}
              maxLength={REFLECTION_FIELD_MAX}
              value={answers[f.key]}
              placeholder={PLACEHOLDERS[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              style={{ resize: "vertical", minHeight: 76, lineHeight: 1.5 }}
            />
          </label>
        ))}

        <div>
          <span className="ep-label" style={{ display: "block", marginBottom: 6 }}>{t("Ta semaine en une humeur")}</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("Humeur de la semaine")}>
            {MOODS.map((m) => {
              const active = mood === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={m.label}
                  title={m.label}
                  onClick={() => pickMood(m.value)}
                  className="ep-press"
                  style={{
                    width: 44, height: 44, borderRadius: 12, fontSize: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: active ? "rgba(224,30,30,0.18)" : "rgba(0,0,0,0.35)",
                    border: `1px solid ${active ? "rgba(224,30,30,0.55)" : "rgba(224,30,30,0.12)"}`,
                    cursor: "pointer",
                  }}
                >
                  {m.emoji}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p role="alert" style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#f87171" }}>
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={submit} disabled={pending} className="ep-btn-primary">
            {pending ? t("Enregistrement...") : hasSaved ? t("Mettre à jour ma revue") : t("Enregistrer ma revue")}
          </button>
          {hasSaved && (
            <button
              type="button"
              onClick={() => {
                if (savedVersion) {
                  setAnswers(savedVersion.answers);
                  setMood(savedVersion.mood);
                }
                setEditing(false);
                setError(null);
              }}
              className="ep-btn-secondary"
              style={{ padding: "12px 16px", fontSize: 11 }}
            >
              {t("Annuler")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
