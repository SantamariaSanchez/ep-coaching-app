import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCommunityPostCount } from "@/utils/community";
import { createServerSupabase } from "@/lib/supabase-server";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileEditor from "@/components/profile/ProfileEditor";
import AccountActions from "@/components/profile/AccountActions";

export default async function CoachProfilePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "client") redirect("/dashboard/client/profile");

  const [postCount, supabase] = await Promise.all([
    getCommunityPostCount(user.id),
    createServerSupabase(),
  ]);
  const { data: pushSub } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
          Mon espace
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mon profil</h1>
      </div>

      <ProfileHeader profile={profile} postCount={postCount} />

      <ProfileEditor fullName={profile.full_name ?? ""} phone={profile.phone} bio={profile.bio} />

      <AccountActions
        email={profile.email}
        signOutRedirect="/auth/coach"
        pushSubscribed={!!pushSub}
      />
    </div>
  );
}
