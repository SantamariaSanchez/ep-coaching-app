"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";

// Écran d'enrôlement TOTP (QR code + code de vérification), partagé entre les
// paramètres du compte et l'écran d'activation obligatoire du fondateur.
// S'appuie uniquement sur le MFA natif de Supabase Auth, aucune librairie.

type Enrollment = { factorId: string; qrSrc: string | null; secret: string };

// Supabase renvoie le QR code sous forme de SVG brut, et @supabase/auth-js le
// prefixe simplement de "data:image/svg+xml;utf-8," sans jamais l'encoder.
// Ce SVG fait environ 350 Ko (un <rect> par module du QR) : on obtient donc une
// URL data: geante contenant des retours a la ligne, des espaces et des
// guillemets non encodes, que le navigateur doit reparser entierement. C'est
// ce qui figeait l'ecran d'activation apres le clic sur "Activer".
// On repasse par un Blob : meme image, mais l'URL reste courte et le contenu
// n'a plus a transiter par l'analyseur d'URL.
const AUTH_JS_PREFIX = "data:image/svg+xml;utf-8,";

function toQrObjectUrl(qrCode: string | null | undefined): string | null {
  if (!qrCode) return null;
  try {
    const raw = qrCode.startsWith(AUTH_JS_PREFIX)
      ? qrCode.slice(AUTH_JS_PREFIX.length)
      : qrCode;
    if (!raw.includes("<svg")) return null;
    return URL.createObjectURL(new Blob([raw], { type: "image/svg+xml" }));
  } catch {
    return null;
  }
}

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
  const [qrBroken, setQrBroken] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  // Libère l'URL du QR quand l'écran disparaît, sinon le Blob reste en mémoire
  // tant que l'onglet est ouvert.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    setQrBroken(false);

    // Tout ce bloc est sous try/catch : sans ça, la moindre exception (réseau
    // coupé, session illisible, appel MFA qui rejette) laissait le bouton
    // bloqué sur "Préparation…" indéfiniment, sans aucun message.
    try {
      const sb = createClientSupabase();

      // Un enrôlement abandonné laisse un facteur non vérifié qui peut gêner le
      // suivant : on nettoie avant de repartir. Un échec de nettoyage ne doit
      // pas empêcher la suite, Supabase accepte un nouvel enrôlement malgré un
      // facteur non vérifié résiduel.
      try {
        const { data: existing } = await sb.auth.mfa.listFactors();
        for (const factor of existing?.all ?? []) {
          if (factor.status !== "verified") {
            await sb.auth.mfa.unenroll({ factorId: factor.id });
          }
        }
      } catch {
        /* nettoyage best effort */
      }

      const { data, error: enrollError } = await sb.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `EP Coaching ${Date.now()}`,
        issuer: "EP Coaching",
      });

      if (enrollError || !data?.totp?.secret) {
        setError(
          enrollError?.message
            ? `Activation impossible : ${enrollError.message}`
            : "Impossible de démarrer l'activation. Réessaie dans un instant."
        );
        return;
      }

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const qrSrc = toQrObjectUrl(data.totp.qr_code);
      objectUrlRef.current = qrSrc;
      if (!qrSrc) setQrBroken(true);

      setEnrollment({ factorId: data.id, qrSrc, secret: data.totp.secret });
    } catch (e) {
      setError(
        e instanceof Error
          ? `Activation impossible : ${e.message}`
          : "Impossible de démarrer l'activation. Réessaie dans un instant."
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!enrollment || code.trim().length < 6) return;
    setBusy(true);
    setError(null);

    try {
      const sb = createClientSupabase();
      const { error: verifyError } = await sb.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code: code.trim(),
      });

      if (verifyError) {
        setCode("");
        setError("Code incorrect ou expiré. Regarde le code affiché en ce moment.");
        return;
      }

      onDone?.();
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? `Vérification impossible : ${e.message}`
          : "Vérification impossible. Réessaie dans un instant."
      );
    } finally {
      setBusy(false);
    }
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

      {/* Le QR n'est qu'un raccourci : la clé affichée juste en dessous permet
          toujours de terminer l'activation à la main s'il ne s'affiche pas. */}
      {enrollment.qrSrc && !qrBroken && (
        <div className="bg-white rounded-lg p-3 w-fit mx-auto mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrSrc}
            alt="QR code de double authentification"
            width={180}
            height={180}
            onError={() => setQrBroken(true)}
          />
        </div>
      )}

      {qrBroken && (
        <p className="text-[12px] text-[#FDC4C4] leading-relaxed mb-3">
          Le QR code n&apos;a pas pu s&apos;afficher. Saisis la clé ci dessous à la
          main dans ton application d&apos;authentification, ça revient exactement au même.
        </p>
      )}

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
        placeholder="123456" aria-label="123456"
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
