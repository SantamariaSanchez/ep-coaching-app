import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachPosts } from "@/utils/coach-posts";
import CoachPostsManager from "@/components/ui/CoachPostsManager";
import { createCoachPost, updateCoachPost, deleteCoachPost } from "./actions";

export const dynamic = "force-dynamic";

export default async function CoachPostsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const posts = await getCoachPosts();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Communauté
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mot du coach</h1>
        <p className="mt-1 text-sm text-[#F5EDED]/40">
          Réflexions, conseils, retours d&apos;expérience, visibles par tous les membres.
        </p>
      </div>

      <CoachPostsManager
        posts={posts}
        createCoachPost={createCoachPost}
        updateCoachPost={updateCoachPost}
        deleteCoachPost={deleteCoachPost}
      />
    </div>
  );
}
