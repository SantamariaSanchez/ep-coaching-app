import { redirect } from "next/navigation";
import { getUser, getProfile, getClients } from "@/utils/auth";
import { PushPermission } from "@/components/messaging/PushPermission";
import ConversationView from "@/components/messaging/ConversationView";

// The coach's user ID — fetched by looking for a profile with role=coach
async function getCoachId(): Promise<string | null> {
  try {
    // Admin client bypasses RLS - client cannot read other users profiles
    const { createAdminClient } = await import("@/lib/supabase-admin");
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "coach")
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export default async function ClientMessagesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const coachId = await getCoachId();
  if (!coachId) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-[var(--color-ep-light)]/40 text-sm">
          Ton coach n&apos;est pas encore configuré.
        </p>
      </div>
    );
  }

  // conversation_id is always the client's ID
  const conversationId = user.id;
  const coachName = "Emmanuel Peccoux";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Push permission requested silently */}
      <PushPermission userId={user.id} />

      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--color-ep-dark-red)]/20 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[var(--color-ep-red)]/20 border border-[var(--color-ep-red)]/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-black text-[var(--color-ep-red)]">EP</span>
        </div>
        <div>
          <p className="text-sm font-black text-white">{coachName}</p>
          <p className="text-[10px] text-[var(--color-ep-light)]/35 uppercase tracking-widest">
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
      />
    </div>
  );
}
