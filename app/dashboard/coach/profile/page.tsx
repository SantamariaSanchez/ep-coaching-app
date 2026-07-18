import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCommunityPostCount } from "@/utils/community";
import { createServerSupabase } from "@/lib/supabase-server";
import { getClientIntake } from "@/utils/client-intake";
import { saveClientIntake } from "../clients/[id]/intake/actions";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { resolveAvatarUrl } from "@/utils/avatar";
import ProfileEditor from "@/components/profile/ProfileEditor";
import AccountActions from "@/components/profile/AccountActions";
import ClientIntakeForm from "@/components/ui/ClientIntakeForm";

export default async function CoachProfilePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "client") redirect("/dashboard/client/profile");

  const [postCount, supabase, avatarSrc, intake] = await Promise.all([
    getCommunityPostCount(user.id),
    createServerSupabase(),
    resolveAvatarUrl(profile.avatar_url),
    getClientIntake(user.id),
  ]);
  const { data: pushSub } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon espace
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mon profil</h1>
      </div>

      <ProfileHeader profile={profile} postCount={postCount} avatarSrc={avatarSrc} />

      <ProfileEditor fullName={profile.full_name ?? ""} phone={profile.phone} bio={profile.bio} />

      <div className="mt-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Ma fiche
        </p>
        <h2 className="text-xl font-black uppercase tracking-tight mb-4">Mes infos personnelles</h2>
        <ClientIntakeForm clientId={user.id} existingIntake={intake} saveClientIntake={saveClientIntake} />
      </div>

      <AccountActions
        email={profile.email}
        signOutRedirect="/auth/coach"
        pushSubscribed={!!pushSub}
      />
    </div>
  );
}
