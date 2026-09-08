"use client";

// Bandeau d'échéance du compte gratuit, affiché dans les 21 derniers jours
// avant verrouillage (voir lib/free-tier.ts et FreeTierGate.tsx pour le
// verrou dur qui suit). Volontairement discret mais pas fermable : masquer un
// compte à rebours qui se rapproche va justement à l'encontre de sa raison
// d'être (demande du 2026-09-08, "arrêter les gens qui s'inscrivent et s'en
// foutent de l'appli et reviennent jamais").

import Link from "next/link";
import { Clock } from "lucide-react";

export default function FreeTierBanner({ label }: { label: string }) {
  return (
    <Link
      href="/dashboard/client/abonnement"
      className="flex items-center justify-center gap-2 px-4 py-2 text-[11.5px] font-bold text-white transition-opacity hover:opacity-90"
      style={{ background: "linear-gradient(90deg, #890404, #E01E1E)" }}
    >
      <Clock size={12} className="flex-shrink-0" />
      <span>{label}</span>
      <span className="underline underline-offset-2 opacity-80">Voir l&apos;accompagnement</span>
    </Link>
  );
}
