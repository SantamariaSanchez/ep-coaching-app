"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, X } from "lucide-react";

// Item 47 (chantier 50 idées) : le blocage dur d'enrôlement obligatoire
// pour le fondateur reste désactivé (voir le commentaire détaillé dans
// app/dashboard/layout.tsx — incident du 2026-08-05, correctifs vérifiés
// mais jamais rejoués dans un vrai navigateur). Ce bandeau est le "pousse"
// sans le "force" : visible à chaque session tant que la 2FA n'est pas
// activée, mais jamais bloquant — pas de nouveau risque de verrouillage.
export default function TwoFactorNudgeBanner() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 bg-[#1f0101] border-b border-[#890404]/35"
      style={{ boxShadow: "inset 0 -12px 24px -20px rgba(224,30,30,0.55)" }}
    >
      <ShieldAlert size={15} className="text-[#E01E1E] flex-shrink-0" strokeWidth={2} />
      <p className="text-[12px] text-[#F5EDED]/70 leading-snug flex-1 m-0">
        Active la double authentification sur ton compte fondateur.
        <span className="hidden sm:inline text-[#F5EDED]/40">
          {" "}
          Ce compte voit tous les membres de la plateforme, une 2FA le protège si ton mot de passe fuite.
        </span>
      </p>
      <Link
        href="/dashboard/coach/parametres"
        className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#F5EDED] transition-colors"
      >
        Activer
      </Link>
      <button
        onClick={() => setHidden(true)}
        aria-label="Masquer"
        className="flex-shrink-0 text-[#F5EDED]/25 hover:text-[#F5EDED]/60 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
