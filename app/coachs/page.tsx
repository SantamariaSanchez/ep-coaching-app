import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCoachDirectory } from "@/lib/coach-directory";
import CoachDirectoryExplorer from "@/components/coachs/CoachDirectoryExplorer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Trouve ton coach | EP Coaching",
  description: "Annuaire public des coachs EP Coaching : trouve celui qui correspond à ton objectif.",
};

// Axe 5 (VISION.md) : annuaire public, accessible sans compte, pour qu'un
// visiteur trouve le bon coach avant de s'inscrire — plutôt que d'atterrir
// systématiquement chez le même coach par défaut.
export default async function CoachsDirectoryPage() {
  const coaches = await getCoachDirectory();

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
        <h1 className="text-3xl font-black uppercase tracking-tight">Trouve ton coach</h1>
        <p className="mt-2 text-sm text-[#F5EDED]/45">
          Chaque coach a ses propres points forts. Filtre par ce qui compte pour toi (objectif,
          contrainte particulière) pour trouver le bon interlocuteur.
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
