import { redirect, notFound } from "next/navigation";
import { getUser, getProfile, getClientById, roleBadge } from "@/utils/auth";
import { PushPermission } from "@/components/messaging/PushPermission";
import ConversationView from "@/components/messaging/ConversationView";
import RoleBadge from "@/components/ui/RoleBadge";
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

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  // Le fondateur peut ouvrir une conversation avec n'importe quel utilisateur
  // de la plateforme (support, modération) — pas seulement ses propres
  // clients, contrairement à un coach tiers classique.
  const client = profile?.is_platform_owner
    ? await getProfile(clientId)
    : await getClientById(clientId, user.id);
  if (!client) notFound();

  // conversation_id = client's ID
  const conversationId = clientId;

  return (
    <div className="max-w-2xl mx-auto page-transition">
      <PushPermission userId={user.id} />

      {/* Header */}
      <div className="px-5 py-4 border-b border-[#890404]/20 flex items-center gap-3">
        <Link
          href="/dashboard/coach/messages"
          className="p-1.5 text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="w-8 h-8 rounded-full bg-[#890404]/20 border border-[#890404]/30 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-black text-[#E01E1E] uppercase">
            {(client.full_name ?? "?")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </span>
        </div>
        <div>
          <p className="text-sm font-black text-white flex items-center gap-1.5">
            {client.full_name ?? "Client"}
            <RoleBadge label={roleBadge(client)} />
          </p>
        </div>
      </div>

      <ConversationView
        userId={user.id}
        peerId={clientId}
        peerName={client.full_name ?? "Client"}
        selfName={profile?.full_name ?? undefined}
        conversationId={conversationId}
        isCoach={true}
        pushUrl={`/dashboard/client/messages`}
      />
    </div>
  );
}
