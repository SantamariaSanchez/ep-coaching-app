import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachContentIdeas } from "@/lib/content-ideas";
import ContentStudio from "@/components/coach/ContentStudio";

// Axe 2 (VISION.md) : espace de création de contenu du coach — un endroit
// pour poser des idées Insta/YouTube/LinkedIn avant qu'elles se perdent,
// alimenté en partie par les questions posées dans l'onglet Communauté.
export default async function CoachStudioPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const ideas = await getCoachContentIdeas(user.id);

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Studio créatif
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Idées & brouillons</h1>
        <p className="mt-2 text-sm text-[#F5EDED]/45">
          Un endroit pour ne rien perdre : une idée qui te vient, une question de membre qui
          mérite un post, un script à finir.
        </p>
      </div>

      <ContentStudio initialIdeas={ideas} />
    </div>
  );
}
