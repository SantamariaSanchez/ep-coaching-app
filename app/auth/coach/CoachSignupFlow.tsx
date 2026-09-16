"use client";

import { useState } from "react";
import Link from "next/link";
import PasswordInput from "@/components/ui/PasswordInput";
import { signupCoach } from "./actions";
import { COACH_PLATFORM_PLANS } from "@/lib/coach-platform-plan";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(224,30,30,0.15)",
  borderRadius: 8,
  color: "#F5EDED",
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
  color: "rgba(224,30,30,0.8)",
  marginBottom: 7,
};

export default function CoachSignupFlow() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planId, setPlanId] = useState<string>(COACH_PLATFORM_PLANS[0].id);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Consentement newsletter SÉPARÉ (2026-09-10), jamais pré-coché — même
  // principe que app/auth/client/SignupFlow.tsx.
  const [wantsNewsletter, setWantsNewsletter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Retour direct 2026-09-16 (repasse UX inscription) : dit maintenant
    // précisément quel champ manque plutôt qu'un seul message générique
    // quel que soit le champ en cause (même correctif que SignupFlow.tsx
    // côté client).
    if (!fullName.trim()) {
      setError("Ton nom complet est requis.");
      return;
    }
    if (!email.trim()) {
      setError("Ton email est requis.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (!acceptedTerms) {
      setError("Tu dois accepter les CGU et les CGV pour continuer.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await signupCoach({ fullName, email, password, planId, acceptedTerms, wantsNewsletter });
      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      window.location.href = result.checkoutUrl;
    } catch {
      setError("Une erreur est survenue. Réessaie.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{
        padding: "14px 16px", borderRadius: 10,
        background: "rgba(224,30,30,0.06)", border: "1px solid rgba(224,30,30,0.2)",
      }}>
        <p style={{ fontSize: 13, color: "#F5EDED", margin: 0, fontWeight: 700 }}>
          Utilise EP Coaching pour suivre tes propres clients
        </p>
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.5)", margin: "6px 0 0", lineHeight: 1.5 }}>
          Tes clients restent les tiens, jamais visibles par un autre coach de la plateforme.
        </p>
      </div>

      <div>
        <label style={labelStyle}>Formule</label>
        <div style={{ display: "flex", gap: 10 }}>
          {COACH_PLATFORM_PLANS.map((plan) => {
            const active = planId === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setPlanId(plan.id)}
                style={{
                  flex: 1, textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                  background: active ? "rgba(224,30,30,0.14)" : "rgba(0,0,0,0.3)",
                  border: `1px solid ${active ? "rgba(224,30,30,0.5)" : "rgba(245,237,237,0.1)"}`,
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>{plan.label}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 700, color: "#E01E1E" }}>{plan.priceLabel}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.45)" }}>{plan.sublabel}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Nom complet</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          type="text"
          placeholder="Ton nom" aria-label="Ton nom"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="ton@email.com" aria-label="ton@email.com"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Mot de passe</label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          inputStyle={inputStyle}
        />
        <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.3)", margin: "6px 0 0" }}>
          8 caractères minimum.
        </p>
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          style={{ marginTop: 3, flexShrink: 0, width: 15, height: 15, accentColor: "#E01E1E" }}
        />
        <span style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)", lineHeight: 1.5 }}>
          J&apos;accepte les{" "}
          <Link href="/legal/cgu" target="_blank" style={{ color: "#E01E1E", fontWeight: 700 }}>
            CGU
          </Link>{" "}
          et les{" "}
          <Link href="/legal/cgv" target="_blank" style={{ color: "#E01E1E", fontWeight: 700 }}>
            CGV
          </Link>{" "}
          d&apos;EP Coaching, y compris l&apos;essai gratuit de 2 mois et la facturation automatique
          à son terme sauf résiliation.
        </span>
      </label>

      {/* Newsletter — consentement SÉPARÉ, jamais pré-coché. */}
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={wantsNewsletter}
          onChange={(e) => setWantsNewsletter(e.target.checked)}
          style={{ marginTop: 3, flexShrink: 0, width: 15, height: 15, accentColor: "#E01E1E" }}
        />
        <span style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)", lineHeight: 1.5 }}>
          Je veux aussi recevoir la newsletter EP Coaching. Optionnel, désinscription en un clic à
          tout moment.
        </span>
      </label>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          background: "rgba(224,30,30,0.08)", border: "1px solid rgba(224,30,30,0.25)", borderRadius: 10,
        }}>
          <span style={{ color: "#E01E1E", flexShrink: 0 }}>⚠</span>
          <p style={{ fontSize: 13, color: "#FDC4C4", margin: 0, fontWeight: 500 }}>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="ep-btn-primary"
        style={{ width: "100%", height: 50, fontSize: 13 }}
      >
        {submitting ? "Un instant…" : "Créer mon compte coach"}
      </button>
    </form>
  );
}
