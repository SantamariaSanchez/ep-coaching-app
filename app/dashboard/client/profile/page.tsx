import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCommunityPostCount } from "@/utils/community";
import { getTotalPoints } from "@/lib/gamification";
import { createServerSupabase } from "@/lib/supabase-server";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileEditor from "@/components/profile/ProfileEditor";
import AccountActions from "@/components/profile/AccountActions";

function weeksSince(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr + "T12:00:00").getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--color-ep-dark-red)]/10 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35">{label}</span>
      <span className="text-sm font-semibold text-[var(--color-ep-light)]/75">{value ?? "—"}</span>
    </div>
  );
}

export default async function ClientProfilePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "coach") redirect("/dashboard/coach/profile");

  const [postCount, points, supabase] = await Promise.all([
    getCommunityPostCount(user.id),
    getTotalPoints(user.id),
    createServerSupabase(),
  ]);
  const { data: pushSub } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const weeks = profile.start_date ? weeksSince(profile.start_date) : null;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
          Mon espace
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mon profil</h1>
      </div>

      <ProfileHeader profile={profile} postCount={postCount} points={points} />

      <ProfileEditor fullName={profile.full_name ?? ""} phone={profile.phone} bio={profile.bio} />

      {profile.subscription_status === "active" && (
        <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-5 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-2">
            Mon coaching
          </p>
          {weeks !== null && <InfoRow label="Semaines de coaching" value={`${weeks} semaines`} />}
          <InfoRow label="Objectif" value={profile.goal} />
          <InfoRow
            label="Poids de départ"
            value={profile.weight_start != null ? `${profile.weight_start} kg` : null}
          />
          {profile.competition_category && (
            <InfoRow label="Catégorie" value={profile.competition_category} />
          )}
        </div>
      )}

      <AccountActions
        email={profile.email}
        signOutRedirect="/auth/client"
        pushSubscribed={!!pushSub}
      />
    </div>
  );
}
