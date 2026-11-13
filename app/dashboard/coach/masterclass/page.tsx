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
    <div className="px-4 py-4 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <MasterclassList guides={MASTERCLASS_GUIDES} progress={progress} />
    </div>
  );
}
