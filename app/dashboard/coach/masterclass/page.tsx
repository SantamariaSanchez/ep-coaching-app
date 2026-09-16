import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { MASTERCLASS_GUIDES } from "@/lib/masterclass-guides";
import { getCoachMasterclassProgress } from "@/lib/coach-masterclass-progress";
import MasterclassList from "@/components/coach/MasterclassList";

// Masterclass business (demande directe du fondateur, 2026-09-16) : des
// tutoriels texte complets de A à Z sur un outil/système business, avec de
// vraies étapes concrètes à suivre, pour qu'à la fin le coach ait un
// résultat réel produit, pas juste avoir lu. Contenu statique (voir
// lib/masterclass-guides.ts), seule la progression vit en base par coach.
export default async function MasterclassPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const progress = await getCoachMasterclassProgress(user.id);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon business
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Masterclass</h1>
        <p className="mt-2 text-sm text-[#F5EDED]/45">
          Des guides pas à pas pour repartir avec un résultat réel en main, pas juste avoir lu. Suis les
          étapes dans l&apos;ordre, coche au fur et à mesure.
        </p>
      </div>

      <MasterclassList guides={MASTERCLASS_GUIDES} progress={progress} />
    </div>
  );
}
