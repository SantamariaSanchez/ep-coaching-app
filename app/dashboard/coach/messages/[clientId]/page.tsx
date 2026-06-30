import { redirect, notFound } from "next/navigation";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { PushPermission } from "@/components/messaging/PushPermission";
import ConversationView from "@/components/messaging/ConversationView";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function CoachClientMessagesPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  // Guard: clientId must be a valid UUID
  if (!clientId || clientId === "undefined" || clientId.length < 10) {
    redirect("/dashboard/coach/messages");
  }

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client] = await Promise.all([
    getProfile(user.id),
    getClientById(clientId),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  // conversation_id = client's ID
  const conversationId = clientId;

  return (
    <div className="max-w-2xl mx-auto">
      <PushPermission userId={user.id} />

      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--color-ep-dark-red)]/20 flex items-center gap-3">
        <Link
          href="/dashboard/coach/messages"
          className="p-1.5 text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70 transition-colors"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="w-8 h-8 rounded-full bg-[var(--color-ep-dark-red)]/20 border border-[var(--color-ep-dark-red)]/30 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-black text-[var(--color-ep-red)] uppercase">
            {(client.full_name ?? "?")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </span>
        </div>
        <div>
          <p className="text-sm font-black text-white">
            {client.full_name ?? "Client"}
          </p>
          <p className="text-[10px] text-[var(--color-ep-light)]/35 uppercase tracking-widest">
            Client
          </p>
        </div>
      </div>

      <ConversationView
        userId={user.id}
        peerId={clientId}
        peerName={client.full_name ?? "Client"}
        conversationId={conversationId}
        isCoach={true}
        pushUrl={`/dashboard/client/messages`}
      />
    </div>
  );
}
