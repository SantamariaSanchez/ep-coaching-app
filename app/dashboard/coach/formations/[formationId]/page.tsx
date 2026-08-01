import { notFound } from "next/navigation";
import Link from "next/link";
import { getFormationWithModules } from "@/utils/formations";
import { getUser, getProfile } from "@/utils/auth";
import { redirect } from "next/navigation";
import CoachFormationEditor from "./CoachFormationEditor";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoachFormationDetailPage({
  params,
}: {
  params: Promise<{ formationId: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");
  const { formationId } = await params;

  const formation = await getFormationWithModules(formationId);
  if (!formation) notFound();

  return (
    <div
      className="page-transition"
      style={{ padding: "32px 20px 48px", maxWidth: 700, margin: "0 auto" }}
    >
      <Link
        href="/dashboard/coach/formations"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "rgba(245,237,237,0.3)", textDecoration: "none",
          fontSize: 11, fontWeight: 600, marginBottom: 20, letterSpacing: "0.05em",
        }}
        className="animate-fade-in"
      >
        <ChevronLeft size={13} /> Formations
      </Link>

      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>{formation.emoji} Formation</p>
        <h1 className="ep-h1">{formation.title}</h1>
      </div>

      <CoachFormationEditor formation={formation} />
    </div>
  );
}
