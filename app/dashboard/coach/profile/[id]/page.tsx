import { redirect, notFound } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCommunityPostCount } from "@/utils/community";
import { requireOwnClient } from "@/lib/auth-guards";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { resolveAvatarUrl } from "@/utils/avatar";
import BackButton from "@/components/ui/BackButton";
import SubscriptionToggle from "@/components/ui/SubscriptionToggle";
import FounderModerationPanel from "@/components/admin/FounderModerationPanel";

export default async function CoachPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/");

  const { id } = await params;
  if (id === user.id) redirect("/dashboard/coach/profile");

  const myProfile = await getProfile(user.id);
  const isFounder = myProfile?.is_platform_owner === true;

  // Un coach ne doit consulter la fiche détaillée (email, tél., abonnement)
  // que de ses propres clients — jamais celle d'un client d'un autre coach.
  // Exception : le fondateur peut consulter n'importe quel profil de la
  // plateforme (nécessaire pour modérer Communauté/Membres tous coachs
  // confondus).
  if (!isFounder) {
    const guard = await requireOwnClient(id);
    if (!guard.ok) notFound();
  }

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

      {/* Seul le coach assigné gère l'abonnement — couvre aussi un profil
          role="coach" qui est le client personnel de ce coach (double rôle). */}
      {profile.coach_id === user.id && (
        <div className="mt-4">
          <SubscriptionToggle
            clientId={profile.id}
            currentStatus={profile.subscription_status}
            currentPlan={profile.subscription_plan}
            currentNextBillingDate={profile.next_billing_date}
          />
        </div>
      )}

      {isFounder && <FounderModerationPanel targetUserId={profile.id} targetName={profile.full_name ?? "cet utilisateur"} />}
    </div>
  );
}
