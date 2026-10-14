"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import Link from "next/link";
import PasswordInput from "@/components/ui/PasswordInput";
import { signupCoach } from "./actions";
import { COACH_PLATFORM_PLANS, COACH_TESTER_PLAN } from "@/lib/coach-platform-plan";
import CoachPlanCards from "@/components/coach/CoachPlanCards";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(var(--ep-shade-rgb),0.4)",
  border: "1px solid rgba(var(--ep-accent-rgb),0.15)",
  borderRadius: 8,
  color: "var(--ep-ink)",
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
  color: "rgba(var(--ep-accent-rgb),0.8)",
  marginBottom: 7,
};

export default function CoachSignupFlow() {
  const t = useT();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planId, setPlanId] = useState<string>(COACH_TESTER_PLAN.id);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Consentement newsletter SÉPARÉ (2026-09-10), jamais pré-coché — même
  // principe que app/auth/client/SignupFlow.tsx.
  const [wantsNewsletter, setWantsNewsletter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const paidPlan = COACH_PLATFORM_PLANS.find((p) => p.id === planId) ?? null;

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
        background: "rgba(var(--ep-accent-rgb),0.06)", border: "1px solid rgba(var(--ep-accent-rgb),0.2)",
      }}>
        <p style={{ fontSize: 13, color: "var(--ep-ink)", margin: 0, fontWeight: 700 }}>
          {t("Utilise EP Coaching pour suivre tes propres clients")}
        </p>
        <p style={{ fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.5)", margin: "6px 0 0", lineHeight: 1.5 }}>
          {t("Tes clients restent les tiens, jamais visibles par un autre coach de la plateforme.")}
        </p>
      </div>

      <div>
        <label style={labelStyle}>{t("Formule")}</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            type="button"
            onClick={() => setPlanId(COACH_TESTER_PLAN.id)}
            aria-pressed={planId === COACH_TESTER_PLAN.id}
            style={{
              textAlign: "left", padding: "14px", borderRadius: 14, cursor: "pointer", minHeight: 48,
              background: planId === COACH_TESTER_PLAN.id ? "rgba(var(--ep-ok-rgb),0.1)" : "rgba(var(--ep-shade-rgb),0.3)",
              border: `${planId === COACH_TESTER_PLAN.id ? 2 : 1}px solid ${planId === COACH_TESTER_PLAN.id ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.12)"}`,
            }}
          >
            <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ep-ink)" }}>{t(COACH_TESTER_PLAN.label)}</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: "var(--ep-ok)" }}>{t(COACH_TESTER_PLAN.priceLabel)}</span>
            </span>
            <span style={{ display: "block", marginTop: 3, fontSize: 12, lineHeight: 1.45, color: "rgba(var(--ep-ink-rgb),0.55)" }}>{t(COACH_TESTER_PLAN.sublabel)}</span>
          </button>
          <CoachPlanCards mode="select" compact selectedId={planId} onSelect={setPlanId} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>{t("Nom complet")}</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          type="text"
          placeholder={t("Ton nom")} aria-label={t("Ton nom")}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>{t("Email")}</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder={t("ton@email.com")} aria-label={t("ton@email.com")}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>{t("Mot de passe")}</label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          inputStyle={inputStyle}
        />
        <p style={{ fontSize: 10.5, color: "rgba(var(--ep-ink-rgb),0.3)", margin: "6px 0 0" }}>
          {t("8 caractères minimum.")}
        </p>
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          style={{ marginTop: 3, flexShrink: 0, width: 15, height: 15, accentColor: "var(--ep-accent)" }}
        />
        <span style={{ fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.5)", lineHeight: 1.5 }}>
          {t("J'accepte les")}{" "}
          <Link href="/legal/cgu" target="_blank" style={{ color: "var(--ep-accent)", fontWeight: 700 }}>
            {t("CGU")}
          </Link>{" "}
          {t("et les")}{" "}
          <Link href="/legal/cgv" target="_blank" style={{ color: "var(--ep-accent)", fontWeight: 700 }}>
            {t("CGV")}
          </Link>{" "}
          {t("d'EP Coaching, y compris la facturation dès la souscription selon la formule choisie.")}
        </span>
      </label>

      {/* Newsletter — consentement SÉPARÉ, jamais pré-coché. */}
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={wantsNewsletter}
          onChange={(e) => setWantsNewsletter(e.target.checked)}
          style={{ marginTop: 3, flexShrink: 0, width: 15, height: 15, accentColor: "var(--ep-accent)" }}
        />
        <span style={{ fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.5)", lineHeight: 1.5 }}>
          {t("Je veux aussi recevoir la newsletter EP Coaching. Optionnel, désinscription en un clic à tout moment.")}
        </span>
      </label>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          background: "rgba(var(--ep-accent-rgb),0.08)", border: "1px solid rgba(var(--ep-accent-rgb),0.25)", borderRadius: 10,
        }}>
          <span style={{ color: "var(--ep-accent)", flexShrink: 0 }}>⚠</span>
          <p style={{ fontSize: 13, color: "var(--ep-pink)", margin: 0, fontWeight: 500 }}>{t(error)}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="ep-btn-primary"
        style={{ width: "100%", minHeight: 50, height: "auto", padding: "12px 16px", fontSize: 13 }}
      >
        {submitting
          ? t("Un instant…")
          : paidPlan
            ? `${t("Créer mon compte et payer")} ${paidPlan.amount} €${t("/mois")}`
            : t("Créer mon compte coach gratuit")}
      </button>
    </form>
  );
}
