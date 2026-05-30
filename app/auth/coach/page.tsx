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
        background:
          "radial-gradient(ellipse 70% 60% at 50% 30%, #3D0505 0%, #1A0101 40%, #0D0000 100%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Back link */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(245,237,237,0.3)",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 32,
          }}
        >
          <ChevronLeft size={14} />
          Retour
        </Link>

        {/* Logo */}
        <div className="animate-fade-up" style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <EPLogo size="md" showCoaching />
        </div>

        {/* Header */}
        <div className="animate-fade-up stagger-2" style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          }}>
            <Shield size={14} style={{ color: "rgba(224,30,30,0.7)" }} strokeWidth={2} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.7)" }}>
              Accès restreint
            </span>
          </div>
          <h1 style={{
            fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: "-0.04em",
            color: "#F5EDED",
            margin: 0,
          }}>
            Espace Coach
          </h1>
        </div>

        {/* Form */}
        <form
          action={formAction}
          className="animate-fade-up stagger-3"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <label style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(224,30,30,0.8)",
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
              style={{ fontSize: 14 }}
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(224,30,30,0.8)",
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
              style={{ fontSize: 14 }}
            />
          </div>

          {state?.error && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              background: "rgba(224,30,30,0.08)",
              border: "1px solid rgba(224,30,30,0.25)",
              borderRadius: 8,
            }}>
              <span style={{ color: "#E01E1E", fontSize: 14, flexShrink: 0 }}>⚠</span>
              <p style={{ fontSize: 13, color: "#FDC4C4", margin: 0, fontWeight: 500 }}>
                {state.error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="ep-btn-primary"
            style={{ width: "100%", height: 48, fontSize: 13, marginTop: 4 }}
          >
            {pending ? "Connexion…" : "SE CONNECTER"}
          </button>
        </form>
      </div>
    </div>
  );
}
