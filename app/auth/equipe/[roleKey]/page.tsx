import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/utils/auth";
import { getStaffMember } from "@/lib/staff";
import { getRoleCard, getStaffRoleConfig, MODULES } from "@/lib/staff-roles";
import StaffAuthCard from "@/components/staff/StaffAuthCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ roleKey: string }> }): Promise<Metadata> {
  const { roleKey } = await params;
  const found = getRoleCard(roleKey);
  return {
    title: found ? `Espace ${found.role.title} | EP Coaching` : "Espace équipe | EP Coaching",
    robots: { index: false, follow: false },
  };
}

// Une page de connexion par métier (demande directe 2026-09-25) : le lien
// est envoyé par le fondateur à la personne recrutée, depuis Organisation.
// Le lien seul ne suffit pas à entrer : la création d'accès exige un email
// autorisé pour CE poste (voir app/auth/equipe/actions.ts).
export default async function StaffAuthPage({ params }: { params: Promise<{ roleKey: string }> }) {
  const { roleKey } = await params;
  const found = getRoleCard(roleKey);
  const cfg = getStaffRoleConfig(roleKey);
  if (!found || !cfg) notFound();

  const user = await getUser();
  if (user) {
    const member = await getStaffMember(user.id);
    if (member?.status === "actif") redirect("/equipe");
  }

  return (
    <StaffAuthCard
      roleKey={roleKey}
      roleTitle={found.role.title}
      poleName={found.pole.name}
      poleColor={found.pole.color}
      mission={found.role.mission}
      modules={cfg.modules.map((k) => MODULES[k].label)}
    />
  );
}
