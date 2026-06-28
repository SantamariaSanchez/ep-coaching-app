import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import RecipesClient from "@/components/recipes/RecipesClient";

export default async function CoachRecettesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/recettes");

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Contenu
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Recettes & idées repas</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Base de recettes à partager avec tes clients — triée par régime, phase, macros,
          allergènes, saison et goûts.
        </p>
      </div>

      <RecipesClient />
    </div>
  );
}
