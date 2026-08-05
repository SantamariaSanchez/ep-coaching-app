"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";

// Écran d'enrôlement TOTP (QR code + code de vérification), partagé entre les
// paramètres du compte et l'écran d'activation obligatoire du fondateur.
// S'appuie uniquement sur le MFA natif de Supabase Auth, aucune librairie.

type Enrollment = { factorId: string; qrCode: string; secret: string };

export default function TwoFactorSetup({
  onDone,
  redirectTo,
}: {
  onDone?: () => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    const sb = createClientSupabase();

    // Un enrôlement abandonné laisse un facteur non vérifié qui bloque le
    // suivant : on nettoie avant de repartir.
    const { data: existing } = await sb.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      if (factor.status !== "verified") {
        await sb.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    const { data, error: enrollError } = await sb.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `EP Coaching ${Date.now()}`,
      issuer: "EP Coaching",
    });

    setBusy(false);
    if (enrollError || !data) {
      setError("Impossible de démarrer l'activation. Réessaie dans un instant.");
      return;
    }
    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function confirm() {
    if (!enrollment || code.trim().length < 6) return;
    setBusy(true);
    setError(null);
    const sb = createClientSupabase();
    const { error: verifyError } = await sb.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code: code.trim(),
    });
    setBusy(false);

    if (verifyError) {
      setError("Code incorrect ou expiré. Regarde le code affiché en ce moment.");
      return;
    }

    onDone?.();
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  if (!enrollment) {
    return (
      <div>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <button
          onClick={start}
          disabled={busy}
          className="flex items-center justify-center gap-2 w-full bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 rounded-lg py-3 text-white font-bold text-xs uppercase tracking-widest transition-colors"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
          {busy ? "Préparation…" : "Activer la double authentification"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[12px] text-[#F5EDED]/60 leading-relaxed mb-3">
        Scanne ce QR code avec ton application d&apos;authentification (Google
        Authenticator, Authy, 1Password…), puis saisis le code à 6 chiffres qu&apos;elle affiche.
      </p>

      <div className="bg-white rounded-lg p-3 w-fit mx-auto mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enrollment.qrCode} alt="QR code de double authentification" width={180} height={180} />
      </div>

      <p className="text-[10px] text-[#F5EDED]/30 text-center mb-1 uppercase tracking-widest font-bold">
        Ou saisis cette clé à la main
      </p>
      <p className="text-[11px] text-[#F5EDED]/55 text-center font-mono break-all mb-4">
        {enrollment.secret}
      </p>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        className="w-full bg-black/40 border border-[#890404]/35 rounded-lg px-4 py-3 text-center text-lg tracking-[0.4em] text-[#F5EDED] outline-none focus:border-[#E01E1E]/60 mb-3"
      />

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <button
        onClick={confirm}
        disabled={busy || code.length < 6}
        className="flex items-center justify-center gap-2 w-full bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 rounded-lg py-3 text-white font-bold text-xs uppercase tracking-widest transition-colors"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
        {busy ? "Vérification…" : "Confirmer et activer"}
      </button>
    </div>
  );
}
