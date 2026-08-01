import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed, isClientCapable } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { PushPermission } from "@/components/messaging/PushPermission";
import ConversationView from "@/components/messaging/ConversationView";

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
      <div className="px-6 py-8 text-center">
        <p className="text-[#F5EDED]/40 text-sm">
          Ton coach n&apos;est pas encore configuré.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: coachProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", coachId)
    .maybeSingle();
  const coachName: string = coachProfile?.full_name ?? "Ton coach";
  const coachInitials = coachName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // conversation_id is always the client's ID
  const conversationId = user.id;
  const canSend = isSubscribed(profile) || (await canMemberSend(coachId, user.id));

  return (
    <div className="max-w-2xl mx-auto">
      {/* Push permission requested silently */}
      <PushPermission userId={user.id} />

      {/* Header */}
      <div className="px-5 py-4 border-b border-[#890404]/20 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#E01E1E]/20 border border-[#E01E1E]/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-black text-[#E01E1E]">{coachInitials}</span>
        </div>
        <div>
          <p className="text-sm font-black text-white">{coachName}</p>
          <p className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest">
            Coach
          </p>
        </div>
      </div>

      <ConversationView
        userId={user.id}
        peerId={coachId}
        peerName={coachName}
        conversationId={conversationId}
        isCoach={false}
        pushUrl="/dashboard/coach/messages"
        canSend={canSend}
      />
    </div>
  );
}
