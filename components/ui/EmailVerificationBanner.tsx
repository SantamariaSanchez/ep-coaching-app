"use client";

import { useState } from "react";
import { MailWarning, X } from "lucide-react";
import { resendVerificationEmail } from "@/app/actions/email-verification";

// Bandeau discret affiché tant que l'email n'est pas confirmé. Volontairement
// non bloquant : le compte reste pleinement utilisable, on ne réintroduit
// aucune friction dans l'inscription en 30 secondes.
export default function EmailVerificationBanner({ email }: { email: string | null }) {
  const [hidden, setHidden] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hidden) return null;

  async function resend() {
    setSending(true);
    setError(null);
    const res = await resendVerificationEmail();
    setSending(false);
    if (res.error) setError(res.error);
    else setSent(true);
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 bg-[#1f0101] border-b border-[#890404]/35"
      style={{ boxShadow: "inset 0 -12px 24px -20px rgba(224,30,30,0.55)" }}
    >
      <MailWarning size={15} className="text-[#E01E1E] flex-shrink-0" strokeWidth={2} />
      <p className="text-[12px] text-[#F5EDED]/70 leading-snug flex-1 m-0">
        {sent ? (
          <>Email envoyé{email ? ` à ${email}` : ""}. Pense à regarder tes spams.</>
        ) : (
          <>
            Confirme ton adresse email pour sécuriser ton compte.
            <span className="hidden sm:inline text-[#F5EDED]/40">
              {" "}
              C&apos;est ce qui te permet de le récupérer si tu perds ton mot de passe.
            </span>
          </>
        )}
      </p>

      {!sent && (
        <button
          onClick={resend}
          disabled={sending}
          className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#F5EDED] disabled:opacity-50 transition-colors"
        >
          {sending ? "Envoi…" : "Renvoyer"}
        </button>
      )}

      <button
        onClick={() => setHidden(true)}
        aria-label="Masquer"
        className="flex-shrink-0 text-[#F5EDED]/25 hover:text-[#F5EDED]/60 transition-colors"
      >
        <X size={14} />
      </button>

      {error && (
        <span className="text-[10px] text-red-400 flex-shrink-0">{error}</span>
      )}
    </div>
  );
}
