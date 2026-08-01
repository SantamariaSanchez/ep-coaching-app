import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
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
import InviteLinkCard from "@/components/coach/InviteLinkCard";
import PersonalCoachCard from "@/components/coach/PersonalCoachCard";
import { createAdminClient } from "@/lib/supabase-admin";

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

  let linkedCoachName: string | null = null;
  if (profile.coach_id) {
    const admin = createAdminClient();
    const { data: linkedCoach } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", profile.coach_id)
      .maybeSingle();
    linkedCoachName = linkedCoach?.full_name ?? "ton coach";
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon espace
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mon profil</h1>
      </div>

      <ProfileHeader profile={profile} postCount={postCount} avatarSrc={avatarSrc} />

      <ProfileEditor
        fullName={profile.full_name ?? ""}
        phone={profile.phone}
        bio={profile.bio}
        instagramHandle={profile.instagram_handle}
      />

      <div className="mt-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Ma fiche
        </p>
        <h2 className="text-xl font-black uppercase tracking-tight mb-4">Mes infos personnelles</h2>
        <ClientIntakeForm clientId={user.id} existingIntake={intake} saveClientIntake={saveClientIntake} />
      </div>

      <InviteLinkCard inviteCode={profile.invite_code} />

      {!profile.is_platform_owner && <PersonalCoachCard linkedCoachName={linkedCoachName} />}

      {profile.is_platform_owner && (
        <Link
          href="/dashboard/coach/admin"
          style={{
            display: "flex", alignItems: "center", gap: 10, marginTop: 24,
            padding: "14px 16px", borderRadius: 12,
            background: "rgba(245,237,237,0.03)", border: "1px solid rgba(245,237,237,0.08)",
            textDecoration: "none", color: "#F5EDED", fontSize: 13, fontWeight: 700,
          }}
        >
          <Shield size={16} style={{ color: "#E01E1E" }} />
          Gérer les coachs de la plateforme
        </Link>
      )}

      <AccountActions
        email={profile.email}
        signOutRedirect="/auth/coach"
        pushSubscribed={!!pushSub}
      />
    </div>
  );
}
