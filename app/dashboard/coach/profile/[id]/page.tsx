import { redirect, notFound } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCommunityPostCount } from "@/utils/community";
import { requireOwnClient } from "@/lib/auth-guards";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { resolveAvatarUrl } from "@/utils/avatar";
import BackButton from "@/components/ui/BackButton";
import SubscriptionToggle from "@/components/ui/SubscriptionToggle";

export default async function CoachPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/");

  const { id } = await params;
  if (id === user.id) redirect("/dashboard/coach/profile");

  // Un coach ne doit consulter la fiche détaillée (email, tél., abonnement)
  // que de ses propres clients — jamais celle d'un client d'un autre coach.
  const guard = await requireOwnClient(id);
  if (!guard.ok) notFound();

  const profile = await getProfile(id);
  if (!profile) notFound();

  const [postCount, avatarSrc] = await Promise.all([
    getCommunityPostCount(id),
    resolveAvatarUrl(profile.avatar_url),
  ]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <BackButton fallbackHref="/dashboard/coach/communaute/membres" />

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Communauté
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Profil</h1>
      </div>

      <ProfileHeader profile={profile} postCount={postCount} avatarSrc={avatarSrc} />

      {profile.role === "client" && (
        <div className="mt-4">
          <SubscriptionToggle
            clientId={profile.id}
            currentStatus={profile.subscription_status}
          />
        </div>
      )}
    </div>
  );
}
