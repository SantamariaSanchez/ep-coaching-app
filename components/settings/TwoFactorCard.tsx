"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";
import TwoFactorSetup from "./TwoFactorSetup";

// Carte "Double authentification" des paramètres du compte.
// Activation optionnelle pour tout le monde, obligatoire pour le fondateur
// (dans ce cas la désactivation n'est pas proposée, voir proxy.ts).
export default function TwoFactorCard({
  enabled,
  mandatory,
}: {
  enabled: boolean;
  mandatory: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disable() {
    setBusy(true);
    setError(null);
    const sb = createClientSupabase();
    const { data } = await sb.auth.mfa.listFactors();
    for (const factor of data?.all ?? []) {
      await sb.auth.mfa.unenroll({ factorId: factor.id });
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mt-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
        Double authentification
      </p>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">
            {enabled ? "Activée" : "Non activée"}
          </p>
          <p className="text-[11px] text-[#F5EDED]/40 mt-1 leading-relaxed">
            {enabled
              ? "Un code à 6 chiffres est demandé à chaque connexion, en plus du mot de passe."
              : mandatory
                ? "Obligatoire sur ce compte : il donne accès à l'ensemble de la plateforme."
                : "Ajoute un code à 6 chiffres à la connexion. Même avec ton mot de passe, personne ne peut entrer sans ton téléphone."}
          </p>
        </div>

        {enabled ? (
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/25 px-2.5 py-1 rounded-full flex-shrink-0">
            Active
          </span>
        ) : (
          <ShieldCheck size={16} className="text-[#E01E1E]/60 flex-shrink-0 mt-0.5" />
        )}
      </div>

      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

      {!enabled && (
        <div className="mt-4">
          {open ? (
            <TwoFactorSetup onDone={() => setOpen(false)} />
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="flex items-center justify-center gap-2 w-full bg-[#E01E1E]/10 border border-[#E01E1E]/25 hover:bg-[#E01E1E]/20 rounded-lg py-3 text-[#E01E1E] font-bold text-xs uppercase tracking-widest transition-colors"
            >
              <ShieldCheck size={13} /> Activer
            </button>
          )}
        </div>
      )}

      {enabled && !mandatory && (
        <button
          onClick={disable}
          disabled={busy}
          className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 text-[#F5EDED]/25 hover:text-red-400 font-bold text-[11px] uppercase tracking-widest transition-colors"
        >
          <ShieldOff size={12} /> {busy ? "Désactivation…" : "Désactiver"}
        </button>
      )}
    </div>
  );
}
