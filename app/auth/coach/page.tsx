"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Shield } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import PasswordInput from "@/components/ui/PasswordInput";
import { createClientSupabase } from "@/lib/supabase-client";
import { loginCoach } from "./actions";
import CoachSignupFlow from "./CoachSignupFlow";

function ForgotPassword({ initialEmail, onDone }: { initialEmail: string; onDone: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!email.trim()) return;
    setSending(true);
    const supabase = createClientSupabase();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setSending(false);
    setSent(true);
  }

  return (
    <div style={{
      padding: "14px 16px", borderRadius: 8,
      background: "rgba(245,237,237,0.03)", border: "1px solid rgba(245,237,237,0.08)",
    }}>
      {sent ? (
        <p style={{ fontSize: 13, color: "#F5EDED", margin: 0 }}>
          Si un compte existe avec cet email, un lien de réinitialisation vient d&apos;être envoyé.
        </p>
      ) : (
        <>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="ton@email.com"
            className="ep-input"
            style={{ marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={send}
              disabled={sending}
              style={{
                flex: 1, height: 40, borderRadius: 8, border: "none",
                background: "#E01E1E", color: "#fff", fontWeight: 700, fontSize: 12,
                textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer",
              }}
            >
              {sending ? "Envoi..." : "Envoyer le lien"}
            </button>
            <button
              type="button"
              onClick={onDone}
              style={{ background: "none", border: "none", color: "rgba(245,237,237,0.35)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function CoachLoginPage() {
  const [state, formAction, pending] = useActionState(loginCoach, null);
  const [email, setEmail] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [tab, setTab] = useState<"connexion" | "inscription">("inscription");

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
            color: "rgba(245,237,237,0.28)",
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
              <Shield size={12} style={{ color: "rgba(224,30,30,0.65)" }} strokeWidth={2} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(224,30,30,0.65)" }}>
                Espace professionnel
              </span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
                fontWeight: 900,
                fontSize: 26,
                letterSpacing: "-0.05em",
                color: "#F5EDED",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Espace Coach
            </h1>
          </div>

          {/* Tabs */}
          <div className="animate-fade-up stagger-2" style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {(["inscription", "connexion"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  flex: 1, height: 38, borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${tab === t ? "rgba(224,30,30,0.5)" : "rgba(245,237,237,0.12)"}`,
                  background: tab === t ? "rgba(224,30,30,0.14)" : "transparent",
                  color: tab === t ? "#F5EDED" : "rgba(245,237,237,0.4)",
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                }}
              >
                {t === "connexion" ? "Connexion" : "Devenir coach"}
              </button>
            ))}
          </div>

          {tab === "inscription" ? (
            <div className="animate-fade-up stagger-3">
              <CoachSignupFlow />
            </div>
          ) : (
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
                color: "rgba(224,30,30,0.75)",
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(224,30,30,0.75)",
                marginBottom: 8,
              }}>
                Mot de passe
              </label>
              <PasswordInput
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="ep-input"
              />
              <button
                type="button"
                onClick={() => setForgotOpen((v) => !v)}
                style={{
                  display: "block", marginTop: 8, background: "none", border: "none",
                  color: "rgba(245,237,237,0.35)", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0,
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {forgotOpen && <ForgotPassword initialEmail={email} onDone={() => setForgotOpen(false)} />}

            {state?.error && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                background: "rgba(224,30,30,0.08)",
                border: "1px solid rgba(224,30,30,0.25)",
                borderRadius: 10,
              }}>
                <span style={{ color: "#E01E1E", flexShrink: 0 }}>⚠</span>
                <p style={{ fontSize: 13, color: "#FDC4C4", margin: 0, fontWeight: 500 }}>
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
          )}
        </div>
      </div>
    </div>
  );
}
