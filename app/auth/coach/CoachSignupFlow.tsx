"use client";

import { useState } from "react";
import PasswordInput from "@/components/ui/PasswordInput";
import { signupCoach } from "./actions";
import { COACH_PLATFORM_PLAN } from "@/lib/coach-platform-plan";

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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError("Nom, email et mot de passe (6 caractères min.) requis.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await signupCoach({ fullName, email, password });
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
          {COACH_PLATFORM_PLAN.priceLabel} — {COACH_PLATFORM_PLAN.sublabel}. Tes clients restent
          les tiens, jamais visibles par un autre coach de la plateforme.
        </p>
      </div>

      <div>
        <label style={labelStyle}>Nom complet</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          type="text"
          placeholder="Ton nom"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="ton@email.com"
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
      </div>

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
