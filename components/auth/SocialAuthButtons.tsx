"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { createClientSupabase } from "@/lib/supabase-client";
import {
  OAUTH_ERROR_MESSAGES, type OAuthErrorCode, type OAuthProvider, type OAuthRole,
} from "@/lib/oauth";

// « Continuer avec Google » et « Continuer avec Apple » : la même paire de
// boutons sur l'accueil public, la connexion et l'inscription (membre et
// coach). Sur le web : départ par /auth/oauth/start (vérifie que le
// fournisseur est activé, sinon renvoie ici avec un message clair). Dans
// l'appli native : navigateur système puis lien profond (voir
// app/auth/oauth/native/page.tsx), Google refuse les vues intégrées.

type Layout = "stack" | "row";

const NATIVE_CTX_KEY = "ep-oauth-ctx";

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M16.37 12.62c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.71-3.19-1.73-1.35-.14-2.65.8-3.34.8-.69 0-1.76-.78-2.9-.76-1.49.02-2.87.87-3.64 2.2-1.55 2.69-.4 6.67 1.11 8.85.74 1.07 1.62 2.27 2.78 2.23 1.12-.04 1.54-.72 2.89-.72 1.35 0 1.73.72 2.9.7 1.2-.02 1.96-1.09 2.69-2.16.85-1.24 1.2-2.44 1.22-2.5-.03-.01-2.34-.9-2.4-3.6zM14.2 6.1c.61-.74 1.03-1.77.91-2.8-.88.04-1.95.59-2.58 1.33-.57.65-1.06 1.7-.93 2.7.98.08 1.98-.5 2.6-1.23z" />
    </svg>
  );
}

export default function SocialAuthButtons({
  role = "client",
  coachCode,
  refCode,
  layout = "stack",
  separator = false,
  note,
  className,
}: {
  role?: OAuthRole;
  coachCode?: string;
  refCode?: string;
  layout?: Layout;
  /** Ligne « ou » sous les boutons (quand le formulaire e-mail suit). */
  separator?: boolean;
  /** Mention sous les boutons (ex. acceptation des CGU), avant le « ou ». */
  note?: React.ReactNode;
  className?: string;
}) {
  const t = useT();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<OAuthErrorCode | null>(null);

  // Retour d'un échec (?oauth_error=...) posé par les routes /auth/oauth/*.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("oauth_error");
    if (code && code in OAUTH_ERROR_MESSAGES) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(code as OAuthErrorCode);
    }
  }, []);

  async function start(provider: OAuthProvider) {
    if (busy) return;
    setError(null);
    setBusy(provider);
    // Code d'invitation lu dans l'adresse quand le parent ne le donne pas.
    const params = new URLSearchParams(window.location.search);
    const coach = coachCode ?? params.get("coach") ?? undefined;
    const ref = refCode ?? params.get("ref") ?? undefined;

    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      try {
        const status = await fetch(`/auth/oauth/status?provider=${provider}`, { cache: "no-store" }).then((r) => r.json());
        if (!status.enabled) {
          setError(status.unreachable ? "failed" : "provider_disabled");
          setBusy(null);
          return;
        }
        localStorage.setItem(NATIVE_CTX_KEY, JSON.stringify({ role, coach, ref }));
        const supabase = createClientSupabase();
        const { data, error: err } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/auth/oauth/native-return`, skipBrowserRedirect: true },
        });
        if (err || !data.url) throw err ?? new Error("no url");
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: data.url });
        setBusy(null);
      } catch {
        setError("failed");
        setBusy(null);
      }
      return;
    }

    const q = new URLSearchParams({ provider, role });
    if (coach) q.set("coach", coach);
    if (ref) q.set("ref", ref);
    window.location.assign(`/auth/oauth/start?${q.toString()}`);
  }

  const buttons: { provider: OAuthProvider; label: string; mark: React.ReactNode }[] = [
    { provider: "google", label: t("Continuer avec Google"), mark: <GoogleMark /> },
    { provider: "apple", label: t("Continuer avec Apple"), mark: <AppleMark /> },
  ];

  return (
    <div className={className} data-layout={layout}>
      <div className={layout === "row" ? "ep-social-row" : "ep-social-stack"}>
        {buttons.map((b) => (
          <button
            key={b.provider}
            type="button"
            className="ep-social-btn"
            data-provider={b.provider}
            onClick={() => start(b.provider)}
            disabled={busy !== null}
            aria-busy={busy === b.provider}
          >
            {busy === b.provider ? <span className="ep-social-spin" aria-hidden="true" /> : b.mark}
            <span>{b.label}</span>
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="ep-social-error">
          {t(OAUTH_ERROR_MESSAGES[error])}
        </p>
      )}
      {note}
      {separator && (
        <div className="ep-social-sep" aria-hidden="true">
          <span>{t("ou")}</span>
        </div>
      )}
    </div>
  );
}
