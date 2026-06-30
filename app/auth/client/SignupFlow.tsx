"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, Crown } from "lucide-react";
import { selfSignup } from "./actions";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(var(--color-ep-red-rgb),0.15)",
  borderRadius: 8,
  color: "var(--color-ep-light)",
  padding: "11px 14px",
  fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
  fontWeight: 500,
  fontSize: 14,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(var(--color-ep-red-rgb),0.8)",
  marginBottom: 7,
};

const OBJECTIFS = ["Perte de poids", "Prise de muscle", "Performance", "Santé & bien-être"];
const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé"];
const SOURCES = ["Instagram", "TikTok", "Bouche à oreille", "Autre"];

function ChoiceGrid({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: "16px 12px",
              borderRadius: 10,
              border: `1px solid ${active ? "rgba(var(--color-ep-red-rgb),0.5)" : "rgba(var(--color-ep-red-rgb),0.15)"}`,
              background: active ? "rgba(var(--color-ep-red-rgb),0.12)" : "rgba(0,0,0,0.3)",
              color: active ? "var(--color-ep-light)" : "rgba(var(--color-ep-light-rgb),0.55)",
              fontWeight: active ? 700 : 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s ease",
              textAlign: "center",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

type Step = "info" | "objectif" | "niveau" | "source" | "choix";
const STEPS: Step[] = ["info", "objectif", "niveau", "source", "choix"];

export default function SignupFlow({ onLoginClick }: { onLoginClick: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [objectif, setObjectif] = useState("");
  const [niveau, setNiveau] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null); // "free" | plan.id | null

  const stepIndex = STEPS.indexOf(step);

  function goNext() {
    setError(null);
    if (step === "info") {
      if (!fullName.trim() || !email.trim() || password.length < 6) {
        setError("Prénom, email et mot de passe (6 caractères min.) requis.");
        return;
      }
      setStep("objectif");
    } else if (step === "objectif") {
      if (!objectif) return setError("Choisis un objectif.");
      setStep("niveau");
    } else if (step === "niveau") {
      if (!niveau) return setError("Choisis ton niveau.");
      setStep("source");
    } else if (step === "source") {
      if (!source) return setError("Choisis une option.");
      setStep("choix");
    }
  }

  function goBack() {
    setError(null);
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  }

  async function handleChoice(planId: string | null, planUrl?: string) {
    setSubmitting(planId ?? "free");
    setError(null);
    try {
      const result = await selfSignup({ fullName, email, password, objectif, niveau, source });
      if ("error" in result) {
        setError(result.error);
        setSubmitting(null);
        return;
      }
      if (planUrl) {
        const url = `${planUrl}?client_reference_id=${result.userId}&prefilled_email=${encodeURIComponent(email)}`;
        window.location.href = url;
      } else {
        router.push("/dashboard/client");
        router.refresh();
      }
    } catch {
      setError("Une erreur est survenue. Réessaie.");
      setSubmitting(null);
    }
  }

  return (
    <div>
      {/* Progress dots */}
      <div style={{ display: "flex", gap: 5, marginBottom: 22 }}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i <= stepIndex ? "var(--color-ep-red)" : "rgba(var(--color-ep-red-rgb),0.15)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>

      {step === "info" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontWeight: 800, fontSize: 19, color: "var(--color-ep-light)", letterSpacing: "-0.02em", margin: "0 0 2px" }}>
            Crée ton compte
          </h2>
          <div>
            <label style={labelStyle}>Prénom et Nom</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder="Jean Dupont" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="ton@email.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Mot de passe</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" style={inputStyle} />
          </div>
        </div>
      )}

      {step === "objectif" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontWeight: 800, fontSize: 19, color: "var(--color-ep-light)", letterSpacing: "-0.02em", margin: "0 0 2px" }}>
            Quel est ton objectif principal ?
          </h2>
          <ChoiceGrid options={OBJECTIFS} value={objectif} onChange={setObjectif} />
        </div>
      )}

      {step === "niveau" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontWeight: 800, fontSize: 19, color: "var(--color-ep-light)", letterSpacing: "-0.02em", margin: "0 0 2px" }}>
            Ton niveau actuel ?
          </h2>
          <ChoiceGrid options={NIVEAUX} value={niveau} onChange={setNiveau} />
        </div>
      )}

      {step === "source" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontWeight: 800, fontSize: 19, color: "var(--color-ep-light)", letterSpacing: "-0.02em", margin: "0 0 2px" }}>
            Comment as-tu connu EP Coaching ?
          </h2>
          <ChoiceGrid options={SOURCES} value={source} onChange={setSource} />
        </div>
      )}

      {step === "choix" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 19, color: "var(--color-ep-light)", letterSpacing: "-0.02em", margin: "0 0 4px" }}>
              Dernière étape
            </h2>
            <p style={{ fontSize: 13, color: "rgba(var(--color-ep-light-rgb),0.4)", margin: 0 }}>
              Rejoins la communauté gratuitement, ou passe directement en coaching premium.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleChoice(null)}
            disabled={submitting !== null}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "16px 18px", borderRadius: 12,
              border: "1px solid rgba(var(--color-ep-light-rgb),0.15)",
              background: "rgba(var(--color-ep-light-rgb),0.04)",
              color: "var(--color-ep-light)", cursor: "pointer", textAlign: "left",
            }}
          >
            <Heart size={20} style={{ color: "rgba(var(--color-ep-light-rgb),0.5)", flexShrink: 0 }} strokeWidth={1.8} />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontWeight: 800, fontSize: 14 }}>Rejoindre la communauté</span>
              <span style={{ display: "block", fontSize: 11, color: "rgba(var(--color-ep-light-rgb),0.35)", marginTop: 2 }}>
                Gratuit — Victoires, Questions, Ressources
              </span>
            </span>
            {submitting === "free" ? (
              <div style={{ width: 16, height: 16, border: "2px solid var(--color-ep-light)", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
            ) : (
              <ChevronRight size={16} style={{ color: "rgba(var(--color-ep-light-rgb),0.3)" }} />
            )}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(var(--color-ep-light-rgb),0.08)" }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "rgba(var(--color-ep-light-rgb),0.25)", textTransform: "uppercase" }}>ou</span>
            <div style={{ flex: 1, height: 1, background: "rgba(var(--color-ep-light-rgb),0.08)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SUBSCRIPTION_PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => handleChoice(plan.id, plan.url)}
                disabled={submitting !== null}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", borderRadius: 12,
                  border: plan.highlight ? "1px solid rgba(var(--color-ep-red-rgb),0.45)" : "1px solid rgba(var(--color-ep-red-rgb),0.18)",
                  background: plan.highlight ? "rgba(var(--color-ep-red-rgb),0.12)" : "rgba(var(--color-ep-red-rgb),0.05)",
                  color: "var(--color-ep-light)", cursor: "pointer", textAlign: "left",
                }}
              >
                {plan.highlight && <Crown size={16} style={{ color: "var(--color-ep-red)", flexShrink: 0 }} strokeWidth={1.8} />}
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 800, fontSize: 13 }}>EP Coaching — {plan.label}</span>
                  <span style={{ display: "block", fontSize: 10, color: "rgba(var(--color-ep-light-rgb),0.35)", marginTop: 1 }}>{plan.sublabel}</span>
                </span>
                <span style={{ fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" }}>
                  {submitting === plan.id ? "…" : plan.priceLabel}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 14, padding: "12px 16px",
          background: "rgba(var(--color-ep-red-rgb),0.08)", border: "1px solid rgba(var(--color-ep-red-rgb),0.25)",
          borderRadius: 8, fontSize: 13, color: "var(--color-ep-pink)",
        }}>
          ⚠ {error}
        </div>
      )}

      {step !== "choix" && (
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 48, height: 48, borderRadius: 10,
                border: "1px solid rgba(var(--color-ep-light-rgb),0.12)", background: "transparent",
                color: "rgba(var(--color-ep-light-rgb),0.4)", cursor: "pointer", flexShrink: 0,
              }}
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <button onClick={goNext} className="ep-btn-primary" style={{ flex: 1, height: 48, fontSize: 13 }}>
            Continuer
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onLoginClick}
        style={{
          display: "block", width: "100%", textAlign: "center",
          marginTop: 18, background: "none", border: "none",
          color: "rgba(var(--color-ep-light-rgb),0.3)", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}
      >
        Déjà membre ? <span style={{ color: "var(--color-ep-red)" }}>Me connecter</span>
      </button>
    </div>
  );
}
