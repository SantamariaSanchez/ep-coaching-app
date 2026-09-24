"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { PREFERENCE_QUESTIONS, type MemberPreferences } from "@/lib/personalization";

const QUESTIONS = PREFERENCE_QUESTIONS;

export default function PersonalizationQuiz({
  onComplete,
  onSkipAll,
  finishing,
}: {
  onComplete: (answers: Partial<MemberPreferences>) => void;
  onSkipAll: () => void;
  finishing: boolean;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<MemberPreferences>>({});

  const question = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  function select(value: string) {
    const next = { ...answers, [question.key]: value };
    setAnswers(next);
    if (isLast) {
      onComplete(next);
    } else {
      setTimeout(() => setStep((s) => s + 1), 180);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Progress dots + skip global */}
      <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flex: 1 }}>
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= step ? "#E01E1E" : "rgba(224,30,30,0.15)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
        <button
          onClick={onSkipAll}
          disabled={finishing}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(245,237,237,0.06)",
            border: "1px solid rgba(245,237,237,0.18)",
            borderRadius: 999,
            cursor: "pointer",
            color: "rgba(245,237,237,0.75)", fontSize: 12, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em",
            flexShrink: 0, padding: "7px 12px", whiteSpace: "nowrap",
            opacity: finishing ? 0.6 : 1,
          }}
        >
          {finishing ? (
            <div style={{ width: 12, height: 12, border: "2px solid rgba(245,237,237,0.75)", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
          ) : (
            <>Passer, accéder à l&apos;appli <X size={13} /></>
          )}
        </button>
      </div>

      {/* Header */}
      <div style={{ padding: "20px 24px 0", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <p style={{
          fontSize: 11, fontWeight: 800, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "#E01E1E", margin: "0 0 6px", textAlign: "center",
        }}>
          Personnalisation · {step + 1}/{QUESTIONS.length}
        </p>
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.4)", textAlign: "center", margin: "0 0 8px" }}>
          5 minutes pour adapter l&apos;appli à toi. 100% optionnel.
        </p>
      </div>

      {/* Question */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px 24px", overflow: "hidden",
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            // transform explicite, pas le raccourci x (voir OnboardingTour.tsx)
            initial={{ opacity: 0, transform: "translateX(40px)" }}
            animate={{ opacity: 1, transform: "translateX(0px)" }}
            exit={{ opacity: 0, transform: "translateX(-40px)" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: "100%", maxWidth: 460 }}
          >
            <h1 style={{
              fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 900,
              letterSpacing: "-0.03em", color: "#F5EDED", margin: "0 0 20px",
              lineHeight: 1.2, textAlign: "center",
            }}>
              {question.title}
            </h1>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {question.options.map((opt) => {
                const selected = answers[question.key] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => select(opt.value)}
                    className="ep-press"
                    style={{
                      textAlign: "left",
                      padding: "16px 18px",
                      borderRadius: 14,
                      cursor: "pointer",
                      background: selected ? "rgba(224,30,30,0.14)" : "rgba(31,1,1,0.5)",
                      border: selected ? "1px solid rgba(224,30,30,0.5)" : "1px solid rgba(245,237,237,0.1)",
                      color: "#F5EDED",
                      fontSize: 14,
                      fontWeight: 600,
                      transition: "background 0.15s, border-color 0.15s, transform 0.12s var(--ep-ease-out)",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Back nav */}
      {step > 0 && (
        <div style={{ padding: "0 24px 36px", maxWidth: 460, width: "100%", margin: "0 auto" }}>
          <button
            onClick={() => setStep((s) => s - 1)}
            style={{
              background: "none", border: "none", color: "rgba(245,237,237,0.35)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0,
            }}
          >
            ← Question précédente
          </button>
        </div>
      )}
    </div>
  );
}
