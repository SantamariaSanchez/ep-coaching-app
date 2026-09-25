"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Briefcase, KeyRound, UserPlus } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import PasswordInput from "@/components/ui/PasswordInput";
import { createClientSupabase } from "@/lib/supabase-client";
import { loginStaff, signupStaff } from "@/app/auth/equipe/actions";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "rgba(224,30,30,0.75)",
  marginBottom: 8,
};

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        padding: "12px 16px",
        background: "rgba(224,30,30,0.08)",
        border: "1px solid rgba(224,30,30,0.25)",
        borderRadius: 10,
      }}
    >
      <p style={{ fontSize: 13, color: "#FDC4C4", margin: 0, fontWeight: 500 }}>{message}</p>
    </div>
  );
}

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
    <div style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(245,237,237,0.03)", border: "1px solid rgba(245,237,237,0.08)" }}>
      {sent ? (
        <p style={{ fontSize: 13, color: "#F5EDED", margin: 0 }}>
          Si un compte existe avec cet email, un lien de réinitialisation vient d&apos;être envoyé.
        </p>
      ) : (
        <>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="ton@email.com" aria-label="Email" className="ep-input" style={{ marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={send} disabled={sending} className="ep-btn-primary" style={{ flex: 1, height: 40, fontSize: 12 }}>
              {sending ? "Envoi..." : "Envoyer le lien"}
            </button>
            <button type="button" onClick={onDone} style={{ background: "none", border: "none", color: "rgba(245,237,237,0.35)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function LoginForm({ roleKey }: { roleKey: string }) {
  const [state, formAction, pending] = useActionState(loginStaff.bind(null, roleKey), null);
  const [email, setEmail] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <label style={labelStyle} htmlFor="staff-login-email">Email</label>
        <input id="staff-login-email" name="email" type="email" required autoComplete="email" placeholder="ton@email.com" className="ep-input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label style={labelStyle} htmlFor="staff-login-password">Mot de passe</label>
        <PasswordInput id="staff-login-password" name="password" required autoComplete="current-password" placeholder="••••••••" className="ep-input" />
        <button type="button" onClick={() => setForgotOpen((v) => !v)} style={{ display: "block", marginTop: 8, background: "none", border: "none", color: "rgba(245,237,237,0.35)", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          Mot de passe oublié ?
        </button>
      </div>
      {forgotOpen && <ForgotPassword initialEmail={email} onDone={() => setForgotOpen(false)} />}
      {state?.error && <ErrorBox message={state.error} />}
      <button type="submit" disabled={pending} className="ep-btn-primary" style={{ width: "100%", height: 50, fontSize: 13 }}>
        {pending ? "Connexion..." : "Me connecter"}
      </button>
    </form>
  );
}

function SignupForm({ roleKey }: { roleKey: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signupStaff({ roleKey, fullName, email, password, acceptedTerms: accepted });
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12, color: "rgba(245,237,237,0.5)", margin: 0, lineHeight: 1.6 }}>
        Tu viens d&apos;être recruté ? Crée ton accès avec l&apos;email de ta candidature. Tu signeras ton
        contrat juste après, et tu le recevras par email.
      </p>
      <div>
        <label style={labelStyle} htmlFor="staff-name">Nom complet</label>
        <input id="staff-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" placeholder="Prénom Nom" className="ep-input" />
      </div>
      <div>
        <label style={labelStyle} htmlFor="staff-email">Email</label>
        <input id="staff-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" placeholder="ton@email.com" className="ep-input" />
      </div>
      <div>
        <label style={labelStyle} htmlFor="staff-password">Mot de passe</label>
        <PasswordInput id="staff-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="8 caractères minimum" className="ep-input" />
      </div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 3, flexShrink: 0, width: 15, height: 15, accentColor: "#E01E1E" }} />
        <span style={{ fontSize: 11.5, color: "rgba(245,237,237,0.55)", lineHeight: 1.5 }}>
          J&apos;accepte les{" "}
          <Link href="/legal/equipe" target="_blank" style={{ color: "#E01E1E", fontWeight: 700 }}>Conditions de collaboration</Link>{" "}
          de l&apos;équipe et la{" "}
          <Link href="/legal/confidentialite" target="_blank" style={{ color: "#E01E1E", fontWeight: 700 }}>politique de confidentialité</Link>.
        </span>
      </label>
      {error && <ErrorBox message={error} />}
      <button type="submit" disabled={pending || !accepted} className="ep-btn-primary" style={{ width: "100%", height: 50, fontSize: 13, opacity: accepted ? 1 : 0.5 }}>
        {pending ? "Création..." : "Créer mon accès"}
      </button>
    </form>
  );
}

export default function StaffAuthCard({
  roleKey,
  roleTitle,
  poleName,
  poleColor,
  mission,
  modules,
}: {
  roleKey: string;
  roleTitle: string;
  poleName: string;
  poleColor: string;
  mission: string;
  modules: string[];
}) {
  const [tab, setTab] = useState<"connexion" | "premiere">("connexion");

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px", position: "relative", zIndex: 1 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div className="ep-auth-card animate-scale-in" style={{ padding: "34px 26px" }}>
          <div className="ep-logo-glow" style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
            <EPLogo size="md" showCoaching />
          </div>

          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Briefcase size={12} style={{ color: poleColor }} strokeWidth={2} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: poleColor }}>
                Équipe · {poleName}
              </span>
            </div>
            <h1 style={{ fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif", fontWeight: 900, fontSize: 24, letterSpacing: "-0.04em", color: "#F5EDED", margin: "0 0 10px", lineHeight: 1.15 }}>
              Espace {roleTitle}
            </h1>
            <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.5)", margin: 0, lineHeight: 1.6 }}>{mission}</p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 22 }}>
            {modules.map((m) => (
              <span key={m} style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(245,237,237,0.5)", border: "1px solid rgba(137,4,4,0.35)", borderRadius: 999, padding: "3px 9px" }}>
                {m}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 22 }} role="tablist">
            {([
              { key: "connexion", label: "Me connecter", icon: KeyRound },
              { key: "premiere", label: "Première connexion", icon: UserPlus },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, height: 40, borderRadius: 8, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                  border: `1px solid ${tab === key ? "rgba(224,30,30,0.5)" : "rgba(245,237,237,0.12)"}`,
                  background: tab === key ? "rgba(224,30,30,0.14)" : "transparent",
                  color: tab === key ? "#F5EDED" : "rgba(245,237,237,0.4)",
                  fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                }}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {tab === "connexion" ? <LoginForm roleKey={roleKey} /> : <SignupForm roleKey={roleKey} />}

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(245,237,237,0.07)", display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center" }}>
            {[
              { href: "/legal/equipe", label: "Conditions de collaboration" },
              { href: "/legal/confidentialite", label: "Confidentialité" },
              { href: "/legal/cgu", label: "CGU de l'appli" },
            ].map((l) => (
              <Link key={l.href} href={l.href} target="_blank" style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(245,237,237,0.35)", textDecoration: "none" }}>
                {l.label}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.25)", textAlign: "center", margin: "12px 0 0", lineHeight: 1.5 }}>
            Accès réservé aux personnes recrutées pour ce poste.
          </p>
        </div>
      </div>
    </div>
  );
}
