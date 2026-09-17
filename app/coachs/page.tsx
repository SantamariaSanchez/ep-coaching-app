import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCoachDirectory } from "@/lib/coach-directory";
import CoachDirectoryExplorer from "@/components/coachs/CoachDirectoryExplorer";

export const dynamic = "force-dynamic";

// Titre/description enrichis du nom (audit SEO 2026-09-17, retour direct :
// "quand on cherche mon nom [...] il faut qu'on ressorte en haut") : cette
// page affiche déjà Santamaria Sanchéz visiblement (CoachDirectoryExplorer,
// seul coach humain à ce jour), mais son nom n'apparaissait dans aucune
// balise title/description alors que c'est la page la plus directement
// pertinente pour une recherche sur son nom propre.
const TITLE = "Santamaria Sanchéz, coach EP Coaching";
const DESCRIPTION =
  "Qui t'accompagne chez EP Coaching : Santamaria Sanchéz, coach en bodybuilding et coach pour les coachs, et sur quoi il peut t'aider.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/coachs" },
  openGraph: { url: "/coachs", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Axe 5 (VISION.md) : annuaire public, accessible sans compte, pour qu'un
// visiteur trouve le bon coach avant de s'inscrire — plutôt que d'atterrir
// systématiquement chez le même coach par défaut.
//
// getCoachDirectory() exclut les coachs IA par défaut : ils restent réservés
// à l'espace connecté (voir la justification dans lib/coach-directory.ts).
// Tant qu'aucun coach tiers humain n'a rejoint la plateforme, cette page ne
// montre donc qu'un seul coach, d'où le titre et l'intro qui s'adaptent au
// nombre réel plutôt que de promettre un annuaire qui n'existe pas encore.
export default async function CoachsDirectoryPage() {
  const coaches = await getCoachDirectory();
  const isDirectory = coaches.length > 1;

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 680, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/ressources"
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors mb-4"
        >
          <ArrowLeft size={11} /> Ressources
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          EP Coaching
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          {isDirectory ? "Trouve ton coach" : "Ton coach"}
        </h1>
        <p className="mt-2 text-sm text-[#F5EDED]/45">
          {isDirectory
            ? "Chaque coach a ses propres points forts. Filtre par ce qui compte pour toi (objectif, contrainte particulière) pour trouver le bon interlocuteur."
            : "Voilà qui t'accompagne, et sur quoi. Pas de plan recopié sur quelqu'un d'autre : ton suivi se construit sur ta situation, et tu comprends chaque choix qu'on fait."}
        </p>
      </div>

      {coaches.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <p className="text-sm text-[#F5EDED]/35">Aucun coach disponible pour l&apos;instant.</p>
        </div>
      ) : (
        <CoachDirectoryExplorer coaches={coaches} />
      )}
    </div>
  );
}
