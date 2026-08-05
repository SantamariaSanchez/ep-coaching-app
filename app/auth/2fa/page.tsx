export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isStrongSession } from "@/lib/mfa";
import TwoFactorChallenge from "@/components/settings/TwoFactorChallenge";
import TwoFactorSetup from "@/components/settings/TwoFactorSetup";

// Deux usages, un seul écran :
//   1. compte protégé par 2FA qui vient de saisir son mot de passe : on demande
//      le code à 6 chiffres avant de laisser entrer (le middleware renvoie ici
//      tant que la session est en aal1) ;
//   2. compte fondateur (is_platform_owner) qui n'a pas encore activé la 2FA :
//      activation obligatoire avant d'accéder au dashboard.
export default async function TwoFactorPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/client?mode=login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, mfa_enabled, is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  const dest = profile?.role === "coach" ? "/dashboard/coach" : "/dashboard/client";

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const alreadyStrong = isStrongSession(session?.access_token);

  // Source de vérité pour choisir l'écran : les facteurs réellement enrôlés,
  // pas la colonne miroir profiles.mfa_enabled. Si le miroir se désynchronise
  // (trigger en échec, restauration...), lire mfa_enabled afficherait l'écran
  // d'activation à quelqu'un qui a déjà une application configurée, et le
  // laisserait tourner en rond au lieu de lui demander simplement son code.
  let hasVerifiedFactor = profile?.mfa_enabled === true;
  try {
    const { data: factorList } = await admin.auth.admin.mfa.listFactors({
      userId: user.id,
    });
    hasVerifiedFactor = (factorList?.factors ?? []).some(
      (f) => f.status === "verified"
    );
  } catch {
    /* on garde la valeur du profil */
  }

  // Rien à faire ici : soit la session est déjà forte, soit le compte n'a
  // aucune obligation de 2FA.
  if (alreadyStrong || (!hasVerifiedFactor && !profile?.is_platform_owner)) {
    redirect(dest);
  }

  const mode = hasVerifiedFactor ? "challenge" : "enrollment";

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-8">
      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-6">
          <EPLogo size="md" showCoaching />
        </div>

        <div className="bg-[#1f0101] border border-[#890404]/30 rounded-2xl p-7">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={13} className="text-[#E01E1E]/70" strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E01E1E]/70">
              Double authentification
            </span>
          </div>

          {mode === "challenge" ? (
            <>
              <h1 className="text-xl font-extrabold text-[#F5EDED] tracking-tight mb-2">
                Saisis ton code
              </h1>
              <p className="text-[12.5px] text-[#F5EDED]/40 leading-relaxed mb-5">
                Ouvre ton application d&apos;authentification et recopie le code à
                6 chiffres associé à EP Coaching.
              </p>
              <TwoFactorChallenge redirectTo={dest} />
            </>
          ) : (
            <>
              <h1 className="text-xl font-extrabold text-[#F5EDED] tracking-tight mb-2">
                Activation requise
              </h1>
              <p className="text-[12.5px] text-[#F5EDED]/40 leading-relaxed mb-5">
                Ce compte donne accès à l&apos;ensemble de la plateforme et à tous
                les membres. La double authentification y est obligatoire.
              </p>
              <TwoFactorSetup redirectTo={dest} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
