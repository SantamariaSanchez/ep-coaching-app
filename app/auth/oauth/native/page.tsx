"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";
import { createClientSupabase } from "@/lib/supabase-client";
import { OAUTH_ERROR_MESSAGES, oauthErrorPath, parseRole, type OAuthErrorCode } from "@/lib/oauth";

// Appli native : arrivée du lien profond epcoaching://app/auth/oauth/native
// après Google ou Apple. La vue de l'appli garde le verrou PKCE : c'est donc
// ici que le code est échangé contre une session, avant de finir la
// connexion côté serveur (profil et rôle au premier passage).

function NativeReturn() {
  const t = useT();
  const params = useSearchParams();
  const [error, setError] = useState<OAuthErrorCode | null>(null);
  const [role, setRole] = useState<"client" | "coach">("client");

  useEffect(() => {
    let ctx: { role?: string; coach?: string; ref?: string } = {};
    try {
      ctx = JSON.parse(localStorage.getItem("ep-oauth-ctx") ?? "{}");
      localStorage.removeItem("ep-oauth-ctx");
    } catch {
      ctx = {};
    }
    const r = parseRole(ctx.role);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRole(r);
    const code = params.get("code");
    if (params.get("error") || !code) {
      setError(params.get("error") === "access_denied" ? "cancelled" : "failed");
      return;
    }
    (async () => {
      try {
        const supabase = createClientSupabase();
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) throw exErr;
        const res = await fetch("/auth/oauth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ctx),
        }).then((x) => x.json());
        if (!res.ok) {
          if (res.error === "not_coach") await supabase.auth.signOut();
          setError((res.error as OAuthErrorCode) ?? "failed");
          return;
        }
        window.location.replace(res.redirect);
      } catch {
        setError("failed");
      }
    })();
  }, [params]);

  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      {error ? (
        <div style={{ maxWidth: 360 }}>
          <p role="alert" style={{ color: "var(--ep-ink)", fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{t(OAUTH_ERROR_MESSAGES[error])}</p>
          <Link href={oauthErrorPath(role, error)} className="ep-btn-primary" style={{ display: "inline-flex", marginTop: 16, minHeight: 48, padding: "0 24px", textDecoration: "none" }}>
            {t("Retour")}
          </Link>
        </div>
      ) : (
        <p style={{ color: "rgba(var(--ep-ink-rgb),0.7)", fontSize: 14, fontWeight: 600 }}>{t("Connexion en cours…")}</p>
      )}
    </main>
  );
}

export default function NativeOAuthPage() {
  return (
    <Suspense fallback={null}>
      <NativeReturn />
    </Suspense>
  );
}
