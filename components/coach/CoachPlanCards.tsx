"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { ArrowRight, Check, Minus, ShieldCheck, Sparkles, Target } from "lucide-react";
import {
  COACH_PLATFORM_PLANS,
  COACH_PLAN_DETAILS,
  COACH_PLAN_COMPARISON,
  COACH_PLAN_REASSURANCE,
} from "@/lib/coach-platform-plan";

type PaidPlanId = (typeof COACH_PLATFORM_PLANS)[number]["id"];

// Cartes des deux formules payantes de l'appli pour un coach (Standard 20 €,
// Premium 200 €). Deux usages :
//  - "link" (page /dashboard/coach-pending) : le bouton mène au paiement
//    Stripe, avec l'id du coach pour activer son compte au retour ;
//  - "select" (inscription /auth/coach) : le bouton choisit la formule, le
//    paiement suit la création du compte.
// Contenu : lib/coach-platform-plan.ts (COACH_PLAN_DETAILS), jamais en dur ici.
export default function CoachPlanCards({
  mode,
  userId,
  selectedId,
  onSelect,
  compact = false,
}: {
  mode: "link" | "select";
  userId?: string;
  selectedId?: string;
  onSelect?: (id: PaidPlanId) => void;
  /** Liste des inclus sans le détail (écrans étroits comme l'inscription). */
  compact?: boolean;
}) {
  const t = useT();

  return (
    <div className="ep-plan-wrap">
    <div className="ep-plan-grid">
      {COACH_PLATFORM_PLANS.map((plan) => {
        const d = COACH_PLAN_DETAILS[plan.id];
        const premium = plan.id === "premium";
        const selected = mode === "select" && selectedId === plan.id;
        const ctaStyle: React.CSSProperties = {
          width: "100%",
          minHeight: 50,
          borderRadius: 14,
          fontSize: 12.5,
          textDecoration: "none",
          marginTop: 18,
        };
        const ctaInner = (
          <>
            {selected ? <Check size={16} strokeWidth={2.6} /> : null}
            {selected ? t("Formule choisie") : t(d.ctaLabel)}
            {!selected && <ArrowRight size={16} />}
          </>
        );

        return (
          <article
            key={plan.id}
            className={premium ? "ep-card-highlighted" : "ep-card"}
            aria-label={`${plan.label}, ${d.offerName}`}
            style={{
              padding: compact ? "18px 16px" : "22px 18px",
              borderRadius: 20,
              display: "flex",
              flexDirection: "column",
              outline: selected ? "2px solid var(--ep-accent)" : "none",
              outlineOffset: 2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ep-accent)" }}>
                {t(plan.label)}
              </span>
              {d.badge && (
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                    color: "var(--ep-accent)", background: "rgba(var(--ep-accent-rgb),0.12)",
                    border: "1px solid rgba(var(--ep-accent-rgb),0.35)", borderRadius: 999, padding: "4px 9px",
                  }}
                >
                  <Sparkles size={11} /> {t(d.badge)}
                </span>
              )}
            </div>

            <h3 style={{ fontSize: compact ? 21 : 24, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--ep-strong)", margin: 0 }}>
              {t(d.offerName)}
            </h3>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(var(--ep-ink-rgb),0.6)", margin: "8px 0 0" }}>
              {t(d.forWho)}
            </p>

            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 16 }}>
              <span style={{ fontSize: compact ? 36 : 42, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--ep-strong)" }}>
                {plan.amount} €
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.55)" }}>{t("/ mois")}</span>
            </div>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(var(--ep-ink-rgb),0.45)", margin: "6px 0 0" }}>
              {t("TTC, sans engagement, clients illimités")}
            </p>

            <div
              style={{
                display: "flex", gap: 10, alignItems: "flex-start", marginTop: 16, padding: "12px 13px", borderRadius: 14,
                background: "rgba(var(--ep-accent-rgb),0.07)", border: "1px solid rgba(var(--ep-accent-rgb),0.18)",
              }}
            >
              <Target size={16} style={{ color: "var(--ep-accent)", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.45, color: "var(--ep-ink)", margin: 0 }}>{t(d.promise)}</p>
            </div>

            {d.includesIntro && (
              <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", color: "var(--ep-strong)", margin: "18px 0 0" }}>
                {t(d.includesIntro)}
              </p>
            )}
            <ul style={{ listStyle: "none", padding: 0, margin: d.includesIntro ? "10px 0 0" : "18px 0 0", display: "flex", flexDirection: "column", gap: compact ? 8 : 12 }}>
              {d.includes.map((f) => (
                <li key={f.title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    aria-hidden
                    style={{
                      width: 20, height: 20, borderRadius: 999, flexShrink: 0, marginTop: 1,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(var(--ep-ok-rgb),0.14)", color: "var(--ep-ok)",
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, lineHeight: 1.35, color: "var(--ep-ink)" }}>{t(f.title)}</span>
                    {!compact && (
                      <span style={{ display: "block", fontSize: 12.5, lineHeight: 1.5, color: "rgba(var(--ep-ink-rgb),0.58)", marginTop: 2 }}>{t(f.detail)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <div style={{ flex: 1 }} />
            {mode === "link" ? (
              <a
                href={`${plan.url}?client_reference_id=${encodeURIComponent(userId ?? "")}`}
                className={premium ? "ep-btn-primary" : "ep-btn-secondary"}
                style={ctaStyle}
              >
                {ctaInner}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onSelect?.(plan.id)}
                aria-pressed={selected}
                className={premium || selected ? "ep-btn-primary" : "ep-btn-secondary"}
                style={ctaStyle}
              >
                {ctaInner}
              </button>
            )}
          </article>
        );
      })}
    </div>
    </div>
  );
}

/** Ce qui change entre 20 € et 200 €, en lignes courtes. */
export function CoachPlanComparison() {
  const t = useT();
  const cell = (on: boolean) => (
    <span
      aria-label={on ? t("Inclus") : t("Non inclus")}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 999, background: on ? "rgba(var(--ep-ok-rgb),0.14)" : "transparent", color: on ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.25)" }}
    >
      {on ? <Check size={14} strokeWidth={3} /> : <Minus size={14} />}
    </span>
  );
  return (
    <section className="ep-card" style={{ padding: "18px 16px", borderRadius: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--ep-strong)", margin: "0 0 4px" }}>
        {t("Ce qui change entre 20 € et 200 €")}
      </h3>
      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(var(--ep-ink-rgb),0.55)", margin: "0 0 12px" }}>
        {t("Standard pour bien suivre tes clients. Premium pour en trouver d'autres et faire tourner ton business.")}
      </p>
      <div role="table" aria-label={t("Comparatif des formules")}>
        <div role="row" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 76px 76px", alignItems: "center", padding: "0 0 8px", borderBottom: "1px solid rgba(var(--ep-ink-rgb),0.08)" }}>
          <span role="columnheader" />
          <span role="columnheader" style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.55)", textAlign: "center" }}>{t("Standard")}</span>
          <span role="columnheader" style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ep-accent)", textAlign: "center" }}>{t("Premium")}</span>
        </div>
        {COACH_PLAN_COMPARISON.map((row) => (
          <div role="row" key={row.label} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 76px 76px", alignItems: "center", minHeight: 44, borderBottom: "1px solid rgba(var(--ep-ink-rgb),0.06)" }}>
            <span role="cell" style={{ fontSize: 13, lineHeight: 1.35, color: "var(--ep-ink)", paddingRight: 8 }}>{t(row.label)}</span>
            <span role="cell" style={{ textAlign: "center" }}>{cell(row.standard)}</span>
            <span role="cell" style={{ textAlign: "center" }}>{cell(row.premium)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Réassurance : uniquement ce qui est vrai (CGV, Stripe, cloisonnement). */
export function CoachPlanReassurance() {
  const t = useT();
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {COACH_PLAN_REASSURANCE.map((line) => (
        <li key={line} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.5, color: "rgba(var(--ep-ink-rgb),0.65)" }}>
          <ShieldCheck size={16} style={{ color: "var(--ep-ok)", flexShrink: 0, marginTop: 1 }} />
          <span>{t(line)}</span>
        </li>
      ))}
    </ul>
  );
}
