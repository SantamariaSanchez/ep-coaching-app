import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCommunityPostsPage } from "@/utils/community";
import CommunitySubNav from "@/components/community/CommunitySubNav";
import CommunityFeed from "@/components/community/CommunityFeed";

export default async function ClientVictoriesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/communaute/victoires");

  const { posts, nextCursor } = await getCommunityPostsPage("victory");

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <CommunitySubNav base="/dashboard/client/communaute" />

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Communauté
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Victoires</h1>
      </div>

      <CommunityFeed
        type="victory"
        initialPosts={posts}
        initialNextCursor={nextCursor}
        isCoach={false}
        currentUserId={user.id}
      />
    </div>
  );
}
