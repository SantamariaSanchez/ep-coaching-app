"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";

// Deuxième étape de la connexion pour un compte protégé par 2FA : le mot de
// passe seul ne donne accès à rien, le middleware renvoie ici tant que la
// session n'est pas passée en aal2 (voir proxy.ts).
export default function TwoFactorChallenge({ redirectTo }: { redirectTo: string }) {
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
        placeholder="123456"
        className="w-full bg-black/40 border border-[#890404]/35 rounded-lg px-4 py-3.5 text-center text-xl tracking-[0.4em] text-[#F5EDED] outline-none focus:border-[#E01E1E]/60"
      />

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[#E01E1E]/8 border border-[#E01E1E]/25 rounded-lg">
          <span className="text-[#E01E1E] flex-shrink-0">⚠</span>
          <p className="text-[13px] text-[#FDC4C4] m-0 font-medium">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={busy || code.length < 6}
        className="flex items-center justify-center gap-2 w-full bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 rounded-lg py-3.5 text-white font-bold text-xs uppercase tracking-widest transition-colors"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
        {busy ? "Vérification…" : "Valider"}
      </button>

      <button
        type="button"
        onClick={cancel}
        className="text-[11px] font-semibold text-[#F5EDED]/30 hover:text-[#F5EDED]/60 transition-colors"
      >
        Utiliser un autre compte
      </button>
    </form>
  );
}
