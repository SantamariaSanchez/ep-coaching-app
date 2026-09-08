"use client";

// Écran de verrouillage du compte gratuit après 60 jours (voir
// lib/free-tier.ts). Demande directe du 2026-09-08 : "au bout de tant de
// temps d'inactivité... ou encore que il a maximum 2 mois en compte gratuit
// et ensuite soit il prend un coach soit il doit supprimer son compte".
//
// Choix arbitré : verrouillage réversible, données conservées. On ne bloque
// donc pas en supprimant quoi que ce soit ici — juste en empêchant l'accès
// tant qu'aucun coach n'est pris. `locked` fait disparaître automatiquement
// cet écran dès que subscription_status repasse à "active" (prochain rendu
// serveur), sans action manuelle de personne.
//
// Volontairement un composant séparé de DailyGateOverlay (bilan quotidien) :
// celui-ci est fermable, celui-ci ne l'est pas — les deux ne doivent jamais
// partager d'état ou de logique de fermeture par erreur.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, LogOut, Trash2 } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";

// Routes qui doivent rester atteignables même verrouillé : la page
// d'abonnement (c'est littéralement la sortie du verrou) et les paramètres
// (seul endroit d'où supprimer son compte, l'autre issue explicitement
// prévue). Sans cette exception, le verrou se recouvre lui-même sur ces
// pages et les deux liens ci-dessous ne mènent nulle part.
const ALWAYS_REACHABLE = ["/dashboard/client/abonnement", "/dashboard/client/parametres"];

export default function FreeTierGate() {
  const pathname = usePathname();
  if (ALWAYS_REACHABLE.some((p) => pathname?.startsWith(p))) return null;

  async function logout() {
    const supabase = createClientSupabase();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-5"
      style={{ background: "rgba(9,0,0,0.97)", backdropFilter: "blur(6px)" }}
    >
      <div className="w-full max-w-sm text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(224,30,30,0.1)", border: "1px solid rgba(224,30,30,0.3)" }}
        >
          <Lock size={22} className="text-[#E01E1E]" />
        </div>
        <h1 className="text-xl font-black text-white uppercase tracking-tight mb-2">
          Ton accès gratuit est terminé
        </h1>
        <p className="text-[13px] text-[#F5EDED]/55 leading-relaxed mb-6">
          60 jours pour découvrir l&apos;appli, c&apos;est fait. Tes données sont gardées telles
          quelles, rien n&apos;est perdu : prends un coach et tu retrouves tout instantanément.
        </p>

        <Link
          href="/dashboard/client/abonnement"
          className="ep-btn-primary w-full mb-3"
          style={{ height: 50, fontSize: 13, display: "flex" }}
        >
          Voir l&apos;accompagnement
        </Link>

        <div className="flex items-center justify-center gap-4 mt-5">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors"
          >
            <LogOut size={12} /> Me déconnecter
          </button>
          <span className="text-[#F5EDED]/15">·</span>
          <Link
            href="/dashboard/client/parametres"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors"
          >
            <Trash2 size={12} /> Supprimer mon compte
          </Link>
        </div>
      </div>
    </div>
  );
}
