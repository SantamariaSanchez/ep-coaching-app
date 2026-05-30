import { redirect } from "next/navigation";
import { getUser, getProfile, getClients } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import Link from "next/link";
import { MessageCircle, ChevronRight } from "lucide-react";
import { PushPermission } from "@/components/messaging/PushPermission";

interface LastMessage {
  conversation_id: string;
  content: string | null;
  type: string;
  created_at: string;
  is_read: boolean;
  receiver_id: string;
}

export default async function CoachMessagesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const [clients, supabase] = await Promise.all([
    getClients(),
    createServerSupabase(),
  ]);

  // For each client, fetch last message + unread count
  const clientIds = clients.map((c) => c.id);

  const { data: lastMessages } = await supabase
    .from("messages")
    .select("conversation_id, content, type, created_at, is_read, receiver_id")
    .in("conversation_id", clientIds.length > 0 ? clientIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false });

  // Build a map: clientId → { lastMessage, unreadCount }
  const msgMap: Record<string, { content: string; time: string; unread: number }> = {};
  const seenConv = new Set<string>();

  for (const msg of (lastMessages ?? []) as LastMessage[]) {
    const cid = msg.conversation_id;
    if (!seenConv.has(cid)) {
      seenConv.add(cid);
      const content =
        msg.type === "voice"
          ? "🎤 Message vocal"
          : msg.content?.slice(0, 40) ?? "";
      const time = new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(msg.created_at));
      msgMap[cid] = { content, time, unread: 0 };
    }
    if (!msg.is_read && msg.receiver_id === user.id) {
      if (msgMap[cid]) msgMap[cid].unread += 1;
    }
  }

  // Sort clients: those with messages first, then by last message time
  const clientsWithMsg = clients
    .map((c) => ({ ...c, msg: msgMap[c.id] ?? null }))
    .sort((a, b) => {
      if (!a.msg && !b.msg) return 0;
      if (!a.msg) return 1;
      if (!b.msg) return -1;
      return new Date(b.msg.time).getTime() - new Date(a.msg.time).getTime();
    });

  const totalUnread = Object.values(msgMap).reduce((s, v) => s + v.unread, 0);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto page-transition">
      <PushPermission userId={user.id} />

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Messagerie
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Messages
          {totalUnread > 0 && (
            <span className="ml-3 text-lg font-black px-2 py-0.5 rounded-full bg-[#E01E1E] text-white">
              {totalUnread}
            </span>
          )}
        </h1>
      </div>

      {clients.length === 0 && (
        <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl px-5 py-8 text-center">
          <p className="text-sm text-[#F5EDED]/40">Aucun client encore</p>
        </div>
      )}

      <div className="space-y-2">
        {clientsWithMsg.map((client) => (
          <Link
            key={client.id}
            href={`/dashboard/coach/messages/${client.id}`}
            className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 hover:border-[#890404]/40 rounded-xl px-4 py-3.5 transition-colors group"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#890404]/20 border border-[#890404]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-black text-[#E01E1E] uppercase">
                {(client.full_name ?? "?")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white">
                {client.full_name ?? "Client"}
              </p>
              {client.msg ? (
                <p className="text-[10px] text-[#F5EDED]/35 truncate">
                  {client.msg.content}
                </p>
              ) : (
                <p className="text-[10px] text-[#F5EDED]/20 italic">
                  Aucun message
                </p>
              )}
            </div>

            {/* Right: time + unread badge */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {client.msg && (
                <span className="text-[9px] text-[#F5EDED]/25">
                  {client.msg.time}
                </span>
              )}
              {client.msg && client.msg.unread > 0 ? (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#E01E1E] text-white min-w-[18px] text-center">
                  {client.msg.unread}
                </span>
              ) : (
                <ChevronRight
                  size={14}
                  className="text-[#F5EDED]/20 group-hover:text-[#F5EDED]/40 transition-colors"
                />
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
