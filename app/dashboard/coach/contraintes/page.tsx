import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { MEDICAL_CONSTRAINTS } from "@/lib/medical-constraints";
import { HeartPulse, ChevronRight, ShieldAlert } from "lucide-react";

// Axe 8 (VISION.md) — demande directe 2026-08-19 : "fait toute une partie
// sur le côté médical, blessure, réhab etc, maladie, handicap, femme
// enceinte, ménopause etc, donc vraiment toutes les contraintes comme ça".
// Contenu de référence pour le coach HUMAIN qui construit un programme,
// jamais un système de diagnostic ni un contenu confié à un coach IA (voir
// lib/ai-coaches.ts, qui exclut explicitement ces sujets).
export default async function CoachContraintesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Bibliothèque
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <HeartPulse size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          Contraintes & populations spécifiques
        </h1>
        <p className="mt-1 text-sm text-[#F5EDED]/40 leading-relaxed max-w-xl">
          Blessures, maladies chroniques, handicap, grossesse, ménopause, TCA, véganisme, Ramadan,
          obésité : comment adapter un programme, et surtout quand orienter vers un professionnel
          plutôt que d&apos;essayer de gérer la situation seul.
        </p>
      </div>

      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/25 rounded-xl px-4 py-3.5 mt-6 mb-8">
        <ShieldAlert size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11.5px] text-amber-300/85 leading-relaxed">
          Ce contenu est un repère pour construire un programme, jamais un substitut à un avis médical
          individualisé. Face à un signal d&apos;alerte listé dans une fiche, oriente toujours vers un
          professionnel de santé avant d&apos;ajuster le programme toi-même.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {MEDICAL_CONSTRAINTS.map((c) => (
          <Link
            key={c.slug}
            href={`/dashboard/coach/contraintes/${c.slug}`}
            className="ep-card group"
            style={{ padding: "18px 20px", textDecoration: "none" }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-black text-white leading-tight">{c.title}</p>
              <ChevronRight size={15} className="text-[#F5EDED]/20 group-hover:text-[#E01E1E] transition-colors flex-shrink-0 mt-0.5" />
            </div>
            <p className="text-[11.5px] text-[#F5EDED]/40 mt-2 leading-relaxed">{c.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
