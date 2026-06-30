"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { CheckIn } from "@/utils/checkins";
import { replyToCheckin } from "@/app/dashboard/coach/clients/[id]/checkins/actions";

// Legacy numeric labels (for old check-ins pre-redesign)
const FEELING = ["", "Épuisé", "Fatigué", "Correct", "Bien", "Au top"];
const DIGESTION = ["", "Difficile", "Inconfort", "Correcte", "Bien", "Parfaite"];

const sectionLbl = {
  fontSize: 9 as const,
  fontWeight: 800 as const,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  color: "rgba(224,30,30,0.45)",
  margin: "0 0 10px",
};

function QA({ q, a }: { q: string; a: string | null | undefined }) {
  if (!a) return null;
  return (
    <div style={{ paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(137,4,4,0.07)" }}>
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.28)", margin: "0 0 4px" }}>
        {q}
      </p>
      <p style={{ fontSize: 13, color: "rgba(245,237,237,0.78)", lineHeight: 1.6, margin: 0 }}>{a}</p>
    </div>
  );
}

function NumRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(137,4,4,0.07)" }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.28)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#F5EDED" }}>{value}</span>
    </div>
  );
}

function CoachReplyForm({ checkin }: { checkin: CheckIn }) {
  const [state, formAction, isPending] = useActionState(replyToCheckin, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(137,4,4,0.15)" }}>
      <input type="hidden" name="checkin_id" value={checkin.id} />
      <input type="hidden" name="client_id" value={checkin.client_id} />

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", marginBottom: 6 }}>
          Ton retour au client
        </label>
        <textarea
          name="coach_notes"
          rows={4}
          required
          placeholder="Analyse, conseils, encouragements…"
          style={{
            width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(137,4,4,0.35)",
            borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#F5EDED",
            resize: "none", outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ width: 110 }}>
          <label style={{ display: "block", fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", marginBottom: 6 }}>
            Note (/10)
          </label>
          <select
            name="coach_rating"
            style={{
              width: "100%", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(137,4,4,0.35)",
              borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#F5EDED", outline: "none",
            }}
          >
            <option value="">—</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}/10</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          style={{
            flex: 1, background: isPending ? "rgba(224,30,30,0.5)" : "#E01E1E",
            color: "#fff", border: "none", borderRadius: 10, padding: "10px 0",
            fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: isPending ? "wait" : "pointer",
          }}
        >
          {isPending ? "Envoi…" : "Envoyer le retour"}
        </button>
      </div>

      {state && "error" in state && (
        <p style={{ fontSize: 11, color: "#FDC4C4", marginTop: 8 }}>{state.error}</p>
      )}
    </form>
  );
}

export default function CheckinCard({ checkin }: { checkin: CheckIn }) {
  const [expanded, setExpanded] = useState(!checkin.coach_replied_at);

  const weekDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(checkin.week_start));

  const hasQualitative = !!(
    checkin.physique_feeling || checkin.energy_mood || checkin.biggest_win ||
    checkin.training_review || checkin.nutrition_review || checkin.digestion_review ||
    checkin.work_impact || checkin.sleep_review || checkin.upcoming_obstacles ||
    checkin.coach_questions || checkin.additional_notes
  );

  const hasLegacyNumeric = !!(
    checkin.nutrition_adherence || checkin.calories_per_day || checkin.steps_per_day ||
    checkin.hrv || checkin.resting_hr || checkin.digestion || checkin.general_feeling
  );

  return (
    <div style={{
      background: "rgba(31,1,1,0.6)",
      border: "1px solid rgba(137,4,4,0.35)",
      borderRadius: 14,
      overflow: "hidden",
      backdropFilter: "blur(8px)",
    }}>
      {/* Header row — clickable */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", background: "none", border: "none", cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>
              Semaine {checkin.week_number}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(245,237,237,0.28)" }}>
              {weekDate}
            </p>
          </div>

          {/* Weight pill */}
          {(checkin.weight_avg ?? checkin.weight) && (
            <span style={{
              fontSize: 11, fontWeight: 800, color: "#F5EDED",
              background: "rgba(137,4,4,0.2)", border: "1px solid rgba(137,4,4,0.3)",
              borderRadius: 8, padding: "2px 10px",
            }}>
              {(checkin.weight_avg ?? checkin.weight)} kg
            </span>
          )}

          {/* Status badge */}
          {!checkin.coach_replied_at ? (
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "2px 8px", borderRadius: 99,
              background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)",
            }}>
              Sans réponse
            </span>
          ) : (
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "2px 8px", borderRadius: 99,
              background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.22)",
            }}>
              {checkin.coach_rating ? `${checkin.coach_rating}/10` : "Répondu"}
            </span>
          )}
        </div>

        {expanded
          ? <ChevronUp size={15} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} />
          : <ChevronDown size={15} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} />
        }
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0 18px 18px" }}>

          {/* ── Qualitative questions (new format) ───────────────────────── */}
          {hasQualitative && (
            <div style={{ marginBottom: 16 }}>
              <p style={sectionLbl}>Bilan de la semaine</p>
              <QA q="Physique" a={checkin.physique_feeling} />
              <QA q="Énergie / humeur / stress" a={checkin.energy_mood} />
              <QA q="Plus grosse victoire" a={checkin.biggest_win} />
              <QA q="Entraînement" a={checkin.training_review} />
              <QA q="Nutrition" a={checkin.nutrition_review} />
              <QA q="Digestion" a={checkin.digestion_review} />
              <QA q="Travail / vie perso" a={checkin.work_impact} />
              <QA q="Sommeil" a={checkin.sleep_review} />
              <QA q="Obstacles à venir" a={checkin.upcoming_obstacles} />
              <QA q="Questions coach" a={checkin.coach_questions} />
              <QA q="Notes" a={checkin.additional_notes} />
            </div>
          )}

          {/* ── Legacy numeric fields (old format) ───────────────────────── */}
          {hasLegacyNumeric && (
            <div style={{ marginBottom: 16 }}>
              <p style={sectionLbl}>Données chiffrées</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                <div>
                  <NumRow label="Adhérence nutri" value={checkin.nutrition_adherence ? `${checkin.nutrition_adherence}%` : null} />
                  <NumRow label="Calories/j" value={checkin.calories_per_day ? `${checkin.calories_per_day} kcal` : null} />
                  <NumRow label="Pas/j" value={checkin.steps_per_day ? checkin.steps_per_day.toLocaleString("fr-FR") : null} />
                </div>
                <div>
                  <NumRow label="Sommeil" value={checkin.sleep_hours ? `${checkin.sleep_hours}h` : null} />
                  <NumRow label="HRV" value={checkin.hrv ? String(checkin.hrv) : null} />
                  <NumRow label="FC repos" value={checkin.resting_hr ? `${checkin.resting_hr} bpm` : null} />
                  <NumRow
                    label="Digestion"
                    value={checkin.digestion != null ? `${checkin.digestion}/5 — ${DIGESTION[checkin.digestion] ?? ""}` : null}
                  />
                  <NumRow
                    label="Ressenti"
                    value={checkin.general_feeling != null ? `${checkin.general_feeling}/5 — ${FEELING[checkin.general_feeling] ?? ""}` : null}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Legacy client_notes */}
          {checkin.client_notes && !hasQualitative && (
            <div style={{ marginBottom: 16 }}>
              <p style={sectionLbl}>Notes client</p>
              <p style={{ fontSize: 13, color: "rgba(245,237,237,0.7)", lineHeight: 1.6, margin: 0 }}>
                {checkin.client_notes}
              </p>
            </div>
          )}

          {/* ── Drive links ───────────────────────────────────────────────── */}
          {(checkin.photo_drive_link || checkin.video_drive_link) && (
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              {checkin.photo_drive_link && (
                <a
                  href={checkin.photo_drive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 11, fontWeight: 700, color: "#E01E1E",
                    background: "rgba(224,30,30,0.08)", border: "1px solid rgba(224,30,30,0.2)",
                    borderRadius: 8, padding: "6px 12px", textDecoration: "none",
                  }}
                >
                  <ExternalLink size={11} /> Photos Drive
                </a>
              )}
              {checkin.video_drive_link && (
                <a
                  href={checkin.video_drive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 11, fontWeight: 700, color: "#E01E1E",
                    background: "rgba(224,30,30,0.08)", border: "1px solid rgba(224,30,30,0.2)",
                    borderRadius: 8, padding: "6px 12px", textDecoration: "none",
                  }}
                >
                  <ExternalLink size={11} /> Vidéo Drive
                </a>
              )}
            </div>
          )}

          {/* ── Coach reply ───────────────────────────────────────────────── */}
          {checkin.coach_replied_at && checkin.coach_notes ? (
            <div style={{ paddingTop: 14, borderTop: "1px solid rgba(137,4,4,0.12)" }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(74,222,128,0.5)", margin: "0 0 8px" }}>
                Ton retour{checkin.coach_rating ? ` — ${checkin.coach_rating}/10` : ""}
              </p>
              <p style={{ fontSize: 13, color: "rgba(245,237,237,0.72)", lineHeight: 1.6, margin: 0 }}>
                {checkin.coach_notes}
              </p>
            </div>
          ) : (
            <CoachReplyForm checkin={checkin} />
          )}
        </div>
      )}
    </div>
  );
}
