import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachPosts, getViewedPostIds, recordCoachPostView } from "@/utils/coach-posts";
import { MessageSquareText, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(dateStr)
  );
}

export default async function ClientCoachPostsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  const coachId = profile?.role === "coach" ? profile.id : profile?.coach_id;
  const posts = coachId ? await getCoachPosts(coachId) : [];

  // Calculé AVANT de marquer comme vu ci-dessous, sinon plus rien ne
  // ressortirait jamais comme "Nouveau" dès l'affichage de la page.
  const viewedIds = await getViewedPostIds(user.id, posts.map((p) => p.id));
  await Promise.all(
    posts.filter((p) => !viewedIds.has(p.id)).map((p) => recordCoachPostView(user.id, p.id))
  );

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Communauté
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mot du coach</h1>
      </div>

      {posts.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl p-10 text-center">
          <MessageSquareText size={28} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/40">Aucune publication pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-5">
              <div className="flex items-start gap-2 mb-1">
                <p className="text-base font-black text-white flex-1">{post.title}</p>
                {!viewedIds.has(post.id) && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#E01E1E]/15 border border-[#E01E1E]/40 text-[#E01E1E] flex-shrink-0">
                    <Sparkles size={9} /> Nouveau
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#F5EDED]/30 mb-3">{formatDate(post.created_at)}</p>
              <p className="text-sm text-[#F5EDED]/65 leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
