import { getT } from "@/lib/i18n-server";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getScienceArticles, getScienceCounts } from "@/utils/science";
import { FlaskConical } from "lucide-react";
import ScienceSubNav from "@/components/science/ScienceSubNav";
import ArticleListView from "@/components/science/ArticleListView";
import { updateArticle, deleteArticle } from "@/app/dashboard/client/science/actions";

export const dynamic = "force-dynamic";

export default async function CoachScienceActualitePage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/science/actualite");
  // Curation de la bibliothèque partagée (import, correction, suppression)
  // réservée au fondateur, comme les actions serveur : un coach tiers la
  // consulte en lecture seule.
  const canCurate = profile?.is_platform_owner === true;

  const [articles, counts] = await Promise.all([
    getScienceArticles({ actualiteOnly: true }),
    getScienceCounts(user.id),
  ]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          {t("Contenu")}
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <FlaskConical size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          {t("Science")}
        </h1>
        <p className="mt-1 text-sm text-[#F5EDED]/40">
          {t("Synchronisé automatiquement depuis PubMed chaque jour, plus ce que tu ajoutes depuis Recherche.")}
        </p>
      </div>

      <ScienceSubNav base="/dashboard/coach/science" counts={counts} />

      <ArticleListView
        articles={articles}
        isCoach={canCurate}
        emptyLabel="Aucune actualité scientifique pour l'instant."
        updateArticle={canCurate ? updateArticle : undefined}
        deleteArticle={canCurate ? deleteArticle : undefined}
      />
    </div>
  );
}
