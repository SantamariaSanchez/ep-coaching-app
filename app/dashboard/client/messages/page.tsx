import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed, isClientCapable, roleBadge } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { PushPermission } from "@/components/messaging/PushPermission";
import ConversationView from "@/components/messaging/ConversationView";
import RoleBadge from "@/components/ui/RoleBadge";
import { Mail, ChevronRight, Users, Bot } from "lucide-react";
import Link from "next/link";

// Les membres gratuits ne peuvent pas écrire en premier au coach — seulement
// lui répondre une fois qu'il a ouvert la conversation, pour éviter que le
// coach se retrouve sollicité par des membres qu'il ne suit pas activement.
// Les clients payants peuvent toujours écrire.
async function canMemberSend(coachId: string, clientId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", clientId)
      .eq("sender_id", coachId);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

export default async function ClientMessagesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!isClientCapable(profile)) redirect("/dashboard/coach");

  // Le coach affiché est toujours celui rattaché au profil (profile.coach_id),
  // jamais "le premier coach trouvé" — indispensable en multi-coach, et pour
  // un compte coach lui-même suivi par un autre coach (double rôle).
  const coachId = profile?.coach_id ?? null;
  if (!coachId) {
    return (
      <div className="px-6 py-16 text-center max-w-sm mx-auto page-transition">
        <div className="w-14 h-14 rounded-2xl bg-[#890404]/10 flex items-center justify-center mx-auto mb-4">
          <Users size={22} className="text-[#F5EDED]/25" strokeWidth={1.5} />
        </div>
        <p className="text-[#F5EDED]/60 text-sm font-semibold mb-1">
          Tu n&apos;as pas encore de coach.
        </p>
        <p className="text-[#F5EDED]/35 text-xs mb-5">
          Choisis un coach pour pouvoir lui écrire directement.
        </p>
        <Link
          href="/dashboard/client/coachs"
          className="ep-btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, textDecoration: "none" }}
        >
          Trouver un coach
          <ChevronRight size={14} />
        </Link>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: coachProfile } = await admin
    .from("profiles")
    .select("full_name, is_platform_owner, role, subscription_status, is_ai_coach")
    .eq("id", coachId)
    .maybeSingle();
  const coachIsAI = coachProfile?.is_ai_coach === true;
  const coachName: string = coachProfile?.full_name ?? "Ton coach";
  const coachInitials = coachName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const coachBadge = roleBadge(
    coachProfile as {
      role: "coach" | "client";
      subscription_status: "free" | "active" | "canceled";
      is_platform_owner: boolean;
    } | null
  );
  const coachIsFounder = coachProfile?.is_platform_owner === true;

  // conversation_id is always the client's ID
  const conversationId = user.id;
  const canSend = isSubscribed(profile) || (await canMemberSend(coachId, user.id));

  return (
    <div className="max-w-2xl mx-auto page-transition">
      {/* Push permission requested silently */}
      <PushPermission userId={user.id} />

      {/* Header */}
      <div className="px-5 py-4 border-b border-[#890404]/20 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#E01E1E]/20 border border-[#E01E1E]/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-black text-[#E01E1E]">{coachInitials}</span>
        </div>
        <div>
          <p className="text-sm font-black text-white flex items-center gap-1.5">
            {coachName}
            <RoleBadge label={coachBadge} />
            {coachIsAI && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/35">
                <Bot size={9} /> Coach IA
              </span>
            )}
          </p>
          {coachIsAI && (
            <p className="text-[10px] text-[#F5EDED]/35 mt-0.5">
              Réponses automatiques par IA, disponible 24/7.
            </p>
          )}
          {!coachIsFounder && (
            <a
              href="mailto:peccoux.manu@gmail.com"
              className="text-[10px] text-[#F5EDED]/35 hover:text-[#F5EDED]/60 flex items-center gap-1 mt-0.5"
            >
              <Mail size={9} />
              Une question pour le support ? peccoux.manu@gmail.com
            </a>
          )}
        </div>
      </div>

      <ConversationView
        userId={user.id}
        peerId={coachId}
        peerName={coachName}
        selfName={profile?.full_name ?? undefined}
        conversationId={conversationId}
        isCoach={false}
        pushUrl="/dashboard/coach/messages"
        canSend={canSend}
        isPeerAICoach={coachIsAI}
      />
    </div>
  );
}
