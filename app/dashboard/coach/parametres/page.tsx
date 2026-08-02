import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import AccountActions from "@/components/profile/AccountActions";
import InviteLinkCard from "@/components/coach/InviteLinkCard";
import PersonalCoachCard from "@/components/coach/PersonalCoachCard";
import PaymentLinkCard from "@/components/coach/PaymentLinkCard";
import LegalLinksCard from "@/components/settings/LegalLinksCard";

export default async function CoachParametresPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "client") redirect("/dashboard/client/parametres");

  const supabase = await createServerSupabase();
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
        <h1 className="text-3xl font-black uppercase tracking-tight">Paramètres</h1>
      </div>

      <AccountActions
        email={profile.email}
        signOutRedirect="/auth/coach"
        pushSubscribed={!!pushSub}
      />

      {!profile.is_platform_owner && (
        <div className="mt-4">
          <InviteLinkCard inviteCode={profile.invite_code} />
          <PaymentLinkCard initialLink={profile.external_payment_link} />
          <PersonalCoachCard linkedCoachName={linkedCoachName} />
        </div>
      )}

      {profile.is_platform_owner && (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            Administration
          </p>
          <Link
            href="/dashboard/coach/admin"
            className="flex items-center gap-2.5 mb-4 px-4 py-3.5 rounded-xl bg-[#1f0101] border border-[#890404]/25 text-white text-sm font-bold"
          >
            <Shield size={16} style={{ color: "#E01E1E" }} />
            Gérer les coachs de la plateforme
          </Link>
        </div>
      )}

      <LegalLinksCard />
    </div>
  );
}
