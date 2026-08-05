"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import PasswordInput from "@/components/ui/PasswordInput";
import { createClientSupabase } from "@/lib/supabase-client";
import { isPasswordPwned, PWNED_PASSWORD_MESSAGE } from "@/lib/pwned-password";

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

// Page atteinte après avoir cliqué sur le lien reçu par email (via
// /auth/callback?next=/auth/reset-password, qui échange déjà le code contre
// une session) — jusqu'ici il n'existait aucune page pour saisir le nouveau
// mot de passe, le lien connectait l'utilisateur sans rien lui permettre de
// changer.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("6 caractères minimum.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    setError(null);

    // Vérification anti mot de passe fuité : seul le préfixe du SHA1 quitte le
    // navigateur, jamais le mot de passe (voir lib/pwned-password.ts).
    if (await isPasswordPwned(password)) {
      setSubmitting(false);
      setError(PWNED_PASSWORD_MESSAGE);
      return;
    }

    const supabase = createClientSupabase();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError("Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré, redemande-en un.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/dashboard/client");
      router.refresh();
    }, 1500);
  }

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
        <div className="animate-fade-up" style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <EPLogo size="md" showCoaching />
          </div>
        </div>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <CheckCircle2 size={40} style={{ color: "#4ade80", margin: "0 auto 14px" }} />
            <p style={{ color: "#F5EDED", fontSize: 15, fontWeight: 700 }}>Mot de passe mis à jour.</p>
            <p style={{ color: "rgba(245,237,237,0.4)", fontSize: 13, marginTop: 6 }}>Redirection...</p>
          </div>
        ) : (
          <>
            <h2 style={{ fontWeight: 800, fontSize: 20, color: "#F5EDED", letterSpacing: "-0.03em", margin: "0 0 20px", textAlign: "center" }}>
              Choisis un nouveau mot de passe
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Nouveau mot de passe</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  inputStyle={inputStyle}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Confirme le mot de passe</label>
                <PasswordInput
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  inputStyle={inputStyle}
                  autoComplete="new-password"
                  required
                />
              </div>

              {error && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  background: "rgba(224,30,30,0.08)", border: "1px solid rgba(224,30,30,0.25)", borderRadius: 8,
                }}>
                  <span style={{ color: "#E01E1E", flexShrink: 0 }}>⚠</span>
                  <p style={{ fontSize: 13, color: "#FDC4C4", margin: 0, fontWeight: 500 }}>{error}</p>
                </div>
              )}

              <button type="submit" disabled={submitting} className="ep-btn-primary" style={{ width: "100%", height: 48, fontSize: 13 }}>
                {submitting ? "Mise à jour..." : "METTRE À JOUR"}
              </button>
            </form>

            <Link
              href="/"
              style={{
                display: "block", width: "100%", textAlign: "center",
                marginTop: 18, color: "rgba(245,237,237,0.3)", fontSize: 12, fontWeight: 600, textDecoration: "none",
              }}
            >
              Retour à l&apos;accueil
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
