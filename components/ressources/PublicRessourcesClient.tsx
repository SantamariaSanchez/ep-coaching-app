"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Calculator, ChevronRight, Trophy, Users } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";
import type { LeadMagnetSummary } from "@/lib/lead-magnets";
import SignupGateModal from "@/components/ressources/SignupGateModal";
import LeadMagnetsExplorer from "@/components/ressources/LeadMagnetsExplorer";

const FREE_PREVIEW_SECONDS = 60;

export default function PublicRessourcesClient({
  leadMagnets,
  initialQuery,
  isCoach = false,
  hasVictories = false,
}: {
  leadMagnets: LeadMagnetSummary[];
  initialQuery: string;
  isCoach?: boolean;
  /** Au moins une victoire publiée publiquement : sinon la carte
   *  "Réussites des membres" mène vers un écran vide (voir app/bio). */
  hasVictories?: boolean;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(FREE_PREVIEW_SECONDS);
  const [manualOpen, setManualOpen] = useState(false);

  // Logged-in members browse freely — no timer, no gate.
  useEffect(() => {
    const sb = createClientSupabase();
    sb.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user));
  }, []);

  // Pure countdown — never sets showModal directly, so it stays derived
  // below instead of synced via a second effect.
  useEffect(() => {
    if (isLoggedIn !== false || secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isLoggedIn, secondsLeft]);

  const showModal = isLoggedIn === false && (secondsLeft <= 0 || manualOpen);
  const showGate = isLoggedIn === false;

  return (
    <div className="page-transition" style={{ minHeight: "100vh" }}>
      {showGate && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: "#cc0000",
            color: "#fff",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span style={{ letterSpacing: "0.04em" }}>
            Accès libre : {secondsLeft}s
          </span>
          <button
            onClick={() => setManualOpen(true)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 999,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Heart size={11} /> Rejoindre la communauté
          </button>
        </div>
      )}

      <div className="px-6 py-8 max-w-2xl mx-auto pb-24">
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            EP Coaching
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">Ressources</h1>
        </div>

        {leadMagnets.length > 0 && (
          <LeadMagnetsExplorer magnets={leadMagnets} isCoach={isCoach} initialQuery={initialQuery} />
        )}

        {/* Item 18 : calculateurs publics, sans compte — même logique que les
            lead magnets ci-dessus, découvrables sans avoir à chercher. */}
        <Link
          href="/outils"
          className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/25 rounded-xl px-4 py-3.5 mb-6 no-underline"
        >
          <div className="w-9 h-9 rounded-lg bg-[#890404]/10 flex items-center justify-center flex-shrink-0">
            <Calculator size={15} className="text-[#890404]" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Calculateurs gratuits</p>
            <p className="text-[10px] text-[#F5EDED]/35">Calories, macros, charge maximale (1RM)</p>
          </div>
          <ChevronRight size={15} className="text-[#F5EDED]/25 flex-shrink-0" strokeWidth={1.8} />
        </Link>

        {/* Axe 5 (VISION.md) : annuaire public des coachs, même logique de
            découverte que les calculateurs ci-dessus — utile surtout à un
            visiteur pas encore décidé sur QUI le suivre. */}
        <Link
          href="/coachs"
          className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/25 rounded-xl px-4 py-3.5 mb-6 no-underline"
        >
          <div className="w-9 h-9 rounded-lg bg-[#890404]/10 flex items-center justify-center flex-shrink-0">
            <Users size={15} className="text-[#890404]" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Trouve ton coach</p>
            <p className="text-[10px] text-[#F5EDED]/35">Annuaire des coachs, par spécialisation</p>
          </div>
          <ChevronRight size={15} className="text-[#F5EDED]/25 flex-shrink-0" strokeWidth={1.8} />
        </Link>

        {/* Item 44 : mur de réussites publiques, même logique de découverte
            que les calculateurs ci-dessus. Repris dans l'audit de cohérence
            2026-09-01 (même bug que app/bio et app/page.tsx) : affiché
            uniquement s'il y a au moins une victoire publique réelle à
            montrer, sinon la carte mène vers un écran vide. */}
        {hasVictories && (
          <Link
            href="/reussites"
            className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/25 rounded-xl px-4 py-3.5 mb-6 no-underline"
          >
            <div className="w-9 h-9 rounded-lg bg-[#890404]/10 flex items-center justify-center flex-shrink-0">
              <Trophy size={15} className="text-[#890404]" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Réussites des membres</p>
              <p className="text-[10px] text-[#F5EDED]/35">Ce qu&apos;ils partagent, avec leur accord</p>
            </div>
            <ChevronRight size={15} className="text-[#F5EDED]/25 flex-shrink-0" strokeWidth={1.8} />
          </Link>
        )}

      </div>

      {showModal && <SignupGateModal />}
    </div>
  );
}
