"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";

// Deuxième étape de la connexion pour un compte protégé par 2FA : le mot de
// passe seul ne donne accès à rien, le middleware renvoie ici tant que la
// session n'est pas passée en aal2 (voir proxy.ts).
export default function TwoFactorChallenge({ redirectTo }: { redirectTo: string }) {
  const t = useT();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) return;
    setBusy(true);
    setError(null);

    const sb = createClientSupabase();
    const { data: factors, error: listError } = await sb.auth.mfa.listFactors();
    const factorId = factors?.totp?.[0]?.id;

    if (listError || !factorId) {
      setBusy(false);
      setError("Aucune application d'authentification n'est associée à ce compte.");
      return;
    }

    const { error: verifyError } = await sb.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    setBusy(false);

    if (verifyError) {
      setCode("");
      setError("Code incorrect ou expiré. Regarde le code affiché en ce moment.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function cancel() {
    const sb = createClientSupabase();
    await sb.auth.signOut();
    router.push("/auth/client?mode=login");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="123456" aria-label="123456"
        className="w-full bg-(--ep-shade)/40 border border-(--ep-line)/35 rounded-lg px-4 py-3.5 text-center text-xl tracking-[0.4em] text-(--ep-ink) outline-none focus:border-(--ep-accent)/60"
      />

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-(--ep-accent)/8 border border-(--ep-accent)/25 rounded-lg">
          <span className="text-(--ep-accent) flex-shrink-0">⚠</span>
          <p className="text-[13px] text-(--ep-pink) m-0 font-medium">{t(error)}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={busy || code.length < 6}
        className="flex items-center justify-center gap-2 w-full bg-(--ep-accent) hover:bg-(--ep-accent-2) disabled:opacity-40 rounded-lg py-3.5 text-(--ep-strong) font-bold text-xs uppercase tracking-widest transition-colors"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
        {busy ? t("Vérification…") : t("Valider")}
      </button>

      <button
        type="button"
        onClick={cancel}
        className="text-[11px] font-semibold text-(--ep-ink)/30 hover:text-(--ep-ink)/60 transition-colors"
      >
        {t("Utiliser un autre compte")}
      </button>
    </form>
  );
}
