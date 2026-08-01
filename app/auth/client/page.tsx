"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Heart } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import PasswordInput from "@/components/ui/PasswordInput";
import { createClientSupabase } from "@/lib/supabase-client";
import { loginClient } from "./actions";
import SignupFlow from "./SignupFlow";

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

// ── Connexion form ────────────────────────────────────────────────────────────

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
      marginTop: 4, padding: "14px 16px", borderRadius: 8,
      background: "rgba(245,237,237,0.03)", border: "1px solid rgba(245,237,237,0.08)",
    }}>
      {sent ? (
        <p style={{ fontSize: 13, color: "#F5EDED", margin: 0 }}>
          Si un compte existe avec cet email, un lien de réinitialisation vient d&apos;être envoyé.
        </p>
      ) : (
        <>
          <label style={labelStyle}>Email pour réinitialiser</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="ton@email.com"
            style={{ ...inputStyle, marginBottom: 10 }}
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

function ConnexionForm({ onSignupClick }: { onSignupClick: () => void }) {
  const [state, formAction, pending] = useActionState(loginClient, null);
  const [email, setEmail] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);

  return (
    <>
      <h2 style={{ fontWeight: 800, fontSize: 20, color: "#F5EDED", letterSpacing: "-0.03em", margin: "0 0 20px" }}>
        Me connecter
      </h2>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="ton@email.com"
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Mot de passe</label>
          <PasswordInput name="password" required placeholder="••••••••" inputStyle={inputStyle} autoComplete="current-password" />
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
            borderRadius: 8,
          }}>
            <span style={{ color: "#E01E1E", flexShrink: 0 }}>⚠</span>
            <p style={{ fontSize: 13, color: "#FDC4C4", margin: 0, fontWeight: 500 }}>{state.error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="ep-btn-primary"
          style={{ width: "100%", height: 48, fontSize: 13 }}
        >
          {pending ? "Connexion…" : "SE CONNECTER"}
        </button>
      </form>

      <button
        type="button"
        onClick={onSignupClick}
        style={{
          display: "block", width: "100%", textAlign: "center",
          marginTop: 18, background: "none", border: "none",
          color: "rgba(245,237,237,0.3)", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}
      >
        Nouveau ici ? <span style={{ color: "#E01E1E" }}>Rejoindre la communauté</span>
      </button>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClientAuthPage() {
  // Lead-magnet links can deep-link straight to the login tab (?mode=login)
  // — read synchronously via a lazy initializer instead of an effect, no
  // Suspense boundary needed since this skips useSearchParams() entirely.
  const [tab, setTab] = useState<"inscription" | "connexion">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "login"
      ? "connexion"
      : "inscription"
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Back */}
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "rgba(245,237,237,0.3)", textDecoration: "none",
          fontSize: 12, fontWeight: 600, marginBottom: 28,
        }}>
          <ChevronLeft size={14} />
          Retour
        </Link>

        {/* Logo + header */}
        <div className="animate-fade-up" style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <EPLogo size="md" showCoaching />
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Heart size={13} style={{ color: "rgba(224,30,30,0.7)" }} strokeWidth={2} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.7)" }}>
              Communauté
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="animate-fade-up stagger-3">
          {tab === "connexion" ? (
            <ConnexionForm onSignupClick={() => setTab("inscription")} />
          ) : (
            <Suspense fallback={null}>
              <SignupFlow onLoginClick={() => setTab("connexion")} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
