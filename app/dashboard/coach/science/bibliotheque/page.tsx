import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getScienceArticles, getScienceCounts } from "@/utils/science";
import { FlaskConical } from "lucide-react";
import ScienceSubNav from "@/components/science/ScienceSubNav";
import ArticleListView from "@/components/science/ArticleListView";
import { updateArticle, deleteArticle, seedScienceLibrary } from "@/app/dashboard/client/science/actions";

export const dynamic = "force-dynamic";

export default async function CoachScienceBibliothequePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/science/bibliotheque");

  const [articles, counts] = await Promise.all([getScienceArticles(), getScienceCounts(user.id)]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Contenu
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <FlaskConical size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          Science
        </h1>
        <p className="mt-1 text-sm text-[#F5EDED]/40">
          Toutes les études, méta-analyses et revues archivées, issues de PubMed.
        </p>
      </div>

      <ScienceSubNav base="/dashboard/coach/science" counts={counts} />

      <ArticleListView
        articles={articles}
        isCoach
        emptyLabel="La bibliothèque scientifique est vide pour l'instant."
        showSeedButton
        seedAction={seedScienceLibrary}
        updateArticle={updateArticle}
        deleteArticle={deleteArticle}
      />
    </div>
  );
}
