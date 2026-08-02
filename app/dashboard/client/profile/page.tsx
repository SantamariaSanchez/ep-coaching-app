import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, ChevronRight } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { getCommunityPostCount } from "@/utils/community";
import { getTotalPoints } from "@/lib/gamification";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { resolveAvatarUrl } from "@/utils/avatar";
import ProfileEditor from "@/components/profile/ProfileEditor";

function weeksSince(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr + "T12:00:00").getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#890404]/10 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">{label}</span>
      <span className="text-sm font-semibold text-[#F5EDED]/75">{value ?? "···"}</span>
    </div>
  );
}

export default async function ClientProfilePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "coach") redirect("/dashboard/coach/profile");

  const [postCount, points, avatarSrc] = await Promise.all([
    getCommunityPostCount(user.id),
    getTotalPoints(user.id),
    resolveAvatarUrl(profile.avatar_url),
  ]);

  const weeks = profile.start_date ? weeksSince(profile.start_date) : null;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon espace
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mon profil</h1>
      </div>

      <ProfileHeader profile={profile} postCount={postCount} points={points} avatarSrc={avatarSrc} />

      <ProfileEditor
        fullName={profile.full_name ?? ""}
        phone={profile.phone}
        bio={profile.bio}
        instagramHandle={profile.instagram_handle}
      />

      {profile.subscription_status === "active" && (
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
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

      <Link
        href="/dashboard/client/parametres"
        style={{
          display: "flex", alignItems: "center", gap: 10, marginTop: 8,
          padding: "14px 16px", borderRadius: 12,
          background: "rgba(245,237,237,0.03)", border: "1px solid rgba(245,237,237,0.08)",
          textDecoration: "none", color: "#F5EDED", fontSize: 13, fontWeight: 700,
        }}
      >
        <Settings size={16} style={{ color: "#E01E1E" }} />
        <span style={{ flex: 1 }}>Paramètres</span>
        <ChevronRight size={15} style={{ color: "rgba(245,237,237,0.25)" }} />
      </Link>
    </div>
  );
}
