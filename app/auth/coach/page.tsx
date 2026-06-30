"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ChevronLeft, Shield } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import { loginCoach } from "./actions";

export default function CoachLoginPage() {
  const [state, formAction, pending] = useActionState(loginCoach, null);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Back link */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(var(--color-ep-light-rgb),0.28)",
            textDecoration: "none",
            fontSize: 11,
            fontWeight: 600,
            marginBottom: 24,
            letterSpacing: "0.05em",
          }}
        >
          <ChevronLeft size={13} />
          Retour
        </Link>

        {/* Auth card */}
        <div className="ep-auth-card animate-scale-in" style={{ padding: "36px 28px" }}>
          {/* Logo */}
          <div className="animate-fade-up ep-logo-glow" style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <EPLogo size="md" showCoaching />
          </div>

          {/* Header */}
          <div className="animate-fade-up stagger-2" style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Shield size={12} style={{ color: "rgba(var(--color-ep-red-rgb),0.65)" }} strokeWidth={2} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(var(--color-ep-red-rgb),0.65)" }}>
                Accès restreint
              </span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
                fontWeight: 900,
                fontSize: 26,
                letterSpacing: "-0.05em",
                color: "var(--color-ep-light)",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Espace Coach
            </h1>
          </div>

          {/* Form */}
          <form
            action={formAction}
            className="animate-fade-up stagger-3"
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            <div>
              <label style={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(var(--color-ep-red-rgb),0.75)",
                marginBottom: 8,
              }}>
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="ton@email.com"
                className="ep-input"
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(var(--color-ep-red-rgb),0.75)",
                marginBottom: 8,
              }}>
                Mot de passe
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="ep-input"
              />
            </div>

            {state?.error && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                background: "rgba(var(--color-ep-red-rgb),0.08)",
                border: "1px solid rgba(var(--color-ep-red-rgb),0.25)",
                borderRadius: 10,
              }}>
                <span style={{ color: "var(--color-ep-red)", flexShrink: 0 }}>⚠</span>
                <p style={{ fontSize: 13, color: "var(--color-ep-pink)", margin: 0, fontWeight: 500 }}>
                  {state.error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="ep-btn-primary"
              style={{ width: "100%", height: 50, fontSize: 13, marginTop: 4 }}
            >
              {pending ? "Connexion…" : "SE CONNECTER"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
