import { redirect } from "next/navigation";
import { getUser, getProfile, type Profile } from "@/utils/auth";
import { isEmailVerified } from "@/lib/email-verification";
import { createServerSupabase } from "@/lib/supabase-server";
import { isStrongSession } from "@/lib/mfa";
import { getStaffMember, type StaffMember } from "@/lib/staff";
import { getRoleCard, getStaffRoleConfig, type RoleCard, type StaffRoleConfig } from "@/lib/staff-roles";
import { STAFF_CONTRACT_VERSION } from "@/lib/staff-contract";
import type { Pole } from "@/components/ui/OrganisationView";

export interface StaffContext {
  userId: string;
  profile: Profile | null;
  member: StaffMember;
  cfg: StaffRoleConfig;
  role: RoleCard;
  pole: Pole;
  emailVerified: boolean;
  contractSigned: boolean;
}

export function isContractSigned(member: Pick<StaffMember, "contract_signed_at" | "contract_version">): boolean {
  return !!member.contract_signed_at && member.contract_version === STAFF_CONTRACT_VERSION;
}

// Résout la personne connectée dans l'espace équipe, sans rediriger. Utilisé
// par le layout pour construire la navigation.
export async function loadStaffContext(): Promise<StaffContext | "anonymous" | "not-staff" | "inactive"> {
  const user = await getUser();
  if (!user) return "anonymous";
  const member = await getStaffMember(user.id);
  if (!member) return "not-staff";
  if (member.status !== "actif") return "inactive";
  const found = getRoleCard(member.role_key);
  const cfg = getStaffRoleConfig(member.role_key);
  if (!found || !cfg) return "not-staff";
  const profile = await getProfile(user.id);

  // Même règle que app/dashboard/layout.tsx : 2FA activée = session forte
  // exigée pour afficher quoi que ce soit.
  if (profile?.mfa_enabled) {
    let strong = false;
    try {
      const supabase = await createServerSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      strong = isStrongSession(session?.access_token);
    } catch {
      strong = false;
    }
    if (!strong) redirect("/auth/2fa");
  }

  return {
    userId: user.id,
    profile,
    member,
    cfg,
    role: found.role,
    pole: found.pole,
    emailVerified: isEmailVerified(profile),
    contractSigned: isContractSigned(member),
  };
}

// Garde de chaque page de l'espace : sans email vérifié puis contrat signé
// (dans cet ordre), aucune page de travail n'est accessible.
export async function requireStaffPage(
  stage: "workspace" | "contract" | "verify" = "workspace"
): Promise<StaffContext> {
  const ctx = await loadStaffContext();
  if (ctx === "anonymous") redirect("/auth/equipe");
  if (ctx === "not-staff") redirect("/dashboard/client");
  if (ctx === "inactive") redirect("/equipe/inactif");

  if (stage === "verify") {
    if (ctx.emailVerified) redirect(ctx.contractSigned ? "/equipe" : "/equipe/contrat");
    return ctx;
  }
  if (!ctx.emailVerified) redirect("/equipe/verifier");
  if (stage === "contract") {
    if (ctx.contractSigned) redirect("/equipe");
    return ctx;
  }
  if (!ctx.contractSigned) redirect("/equipe/contrat");
  return ctx;
}
