import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import AccountActions from "@/components/profile/AccountActions";
import LegalLinksCard from "@/components/settings/LegalLinksCard";

export default async function ClientParametresPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "coach") redirect("/dashboard/coach/parametres");

  const supabase = await createServerSupabase();
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
        <h1 className="text-3xl font-black uppercase tracking-tight">Paramètres</h1>
      </div>

      <AccountActions
        email={profile.email}
        signOutRedirect="/auth/client"
        pushSubscribed={!!pushSub}
      />

      <div className="mt-4">
        <LegalLinksCard />
      </div>
    </div>
  );
}
