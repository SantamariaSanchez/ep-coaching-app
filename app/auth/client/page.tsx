"use client";

import { requestPasswordReset } from "@/app/auth/password-reset-action";
import { useT } from "@/components/i18n/I18nProvider";
import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Heart } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import PasswordInput from "@/components/ui/PasswordInput";
import { loginClient } from "./actions";
import SignupFlow from "./SignupFlow";

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

// ── Connexion form ────────────────────────────────────────────────────────────

function ForgotPassword({ initialEmail, onDone }: { initialEmail: string; onDone: () => void }) {
  const t = useT();
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!email.trim()) return;
    setSending(true);
    await requestPasswordReset(email.trim()).catch(() => {});
    setSending(false);
    setSent(true);
  }

  return (
    <div style={{
      marginTop: 4, padding: "14px 16px", borderRadius: 8,
      background: "rgba(var(--ep-ink-rgb),0.03)", border: "1px solid rgba(var(--ep-ink-rgb),0.08)",
    }}>
      {sent ? (
        <p style={{ fontSize: 13, color: "var(--ep-ink)", margin: 0 }}>
          {t("Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.")}
        </p>
      ) : (
        <>
          <label style={labelStyle}>{t("Email pour réinitialiser")}</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder={t("ton@email.com")} aria-label={t("ton@email.com")}
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={send}
              disabled={sending}
              style={{
                flex: 1, height: 40, borderRadius: 8, border: "none",
                background: "var(--ep-accent)", color: "#fff", fontWeight: 700, fontSize: 12,
                textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer",
              }}
            >
              {sending ? t("Envoi...") : t("Envoyer le lien")}
            </button>
            <button
              type="button"
              onClick={onDone}
              style={{ background: "none", border: "none", color: "rgba(var(--ep-ink-rgb),0.35)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              {t("Annuler")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ConnexionForm({ onSignupClick }: { onSignupClick: () => void }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(loginClient, null);
  const [email, setEmail] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);

  return (
    <>
      <h2 style={{ fontWeight: 800, fontSize: 20, color: "var(--ep-ink)", letterSpacing: "-0.03em", margin: "0 0 20px" }}>
        {t("Me connecter")}
      </h2>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>{t("Email")}</label>
          <input
            name="email"
            type="email"
            required
            placeholder={t("ton@email.com")} aria-label={t("ton@email.com")}
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>{t("Mot de passe")}</label>
          <PasswordInput name="password" required placeholder="••••••••" inputStyle={inputStyle} autoComplete="current-password" />
          <button
            type="button"
            onClick={() => setForgotOpen((v) => !v)}
            style={{
              display: "block", marginTop: 8, background: "none", border: "none",
              color: "rgba(var(--ep-ink-rgb),0.35)", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0,
            }}
          >
            {t("Mot de passe oublié ?")}
          </button>
        </div>

        {forgotOpen && <ForgotPassword initialEmail={email} onDone={() => setForgotOpen(false)} />}

        {state?.error && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            background: "rgba(var(--ep-accent-rgb),0.08)",
            border: "1px solid rgba(var(--ep-accent-rgb),0.25)",
            borderRadius: 8,
          }}>
            <span style={{ color: "var(--ep-accent)", flexShrink: 0 }}>⚠</span>
            <p style={{ fontSize: 13, color: "var(--ep-pink)", margin: 0, fontWeight: 500 }}>{state.error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="ep-btn-primary"
          style={{ width: "100%", height: 48, fontSize: 13 }}
        >
          {pending ? t("Connexion…") : t("SE CONNECTER")}
        </button>
      </form>

      <button
        type="button"
        onClick={onSignupClick}
        style={{
          display: "block", width: "100%", textAlign: "center",
          marginTop: 18, background: "none", border: "none",
          color: "rgba(var(--ep-ink-rgb),0.3)", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}
      >
        {t("Nouveau ici ?")}{" "}<span style={{ color: "var(--ep-accent)" }}>{t("Rejoindre la communauté")}</span>
      </button>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClientAuthPage() {
  const t = useT();
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
          color: "rgba(var(--ep-ink-rgb),0.3)", textDecoration: "none",
          fontSize: 12, fontWeight: 600, marginBottom: 12,
        }}>
          <ChevronLeft size={14} />
          {t("Retour")}
        </Link>

        {/* Logo + header */}
        <div className="animate-fade-up" style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <EPLogo size="md" showCoaching />
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Heart size={13} style={{ color: "rgba(var(--ep-accent-rgb),0.7)" }} strokeWidth={2} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--ep-accent-rgb),0.7)" }}>
              {t("Communauté")}
            </span>
          </div>
        </div>

        {/* Connexion sociale : le chemin le plus court (un tap), avant le formulaire. */}
        <div className="animate-fade-up stagger-2" style={{ marginBottom: 6 }}>
          <SocialAuthButtons
            role="client"
            separator
            note={
              <p style={{ margin: "10px 0 0", fontSize: 11.5, lineHeight: 1.5, textAlign: "center", color: "rgba(var(--ep-ink-rgb),0.55)" }}>
                {t("En continuant, tu acceptes les")}{" "}
                <Link href="/legal/cgu" style={{ color: "var(--ep-ink)", textDecoration: "underline" }}>{t("CGU")}</Link>{" "}
                {t("et la")}{" "}
                <Link href="/legal/confidentialite" style={{ color: "var(--ep-ink)", textDecoration: "underline" }}>{t("politique de confidentialité")}</Link>.
              </p>
            }
          />
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
