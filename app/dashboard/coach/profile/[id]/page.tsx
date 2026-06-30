import { redirect, notFound } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCommunityPostCount } from "@/utils/community";
import ProfileHeader from "@/components/profile/ProfileHeader";
import BackButton from "@/components/ui/BackButton";

export default async function CoachPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/");

  const { id } = await params;
  if (id === user.id) redirect("/dashboard/coach/profile");

  const profile = await getProfile(id);
  if (!profile) notFound();

  const postCount = await getCommunityPostCount(id);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <BackButton fallbackHref="/dashboard/coach/communaute/membres" />

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
          Communauté
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Profil</h1>
      </div>

      <ProfileHeader profile={profile} postCount={postCount} />
    </div>
  );
}
