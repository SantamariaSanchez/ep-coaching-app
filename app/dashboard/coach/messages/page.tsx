import { redirect } from "next/navigation";
import { getUser, getProfile, getAllMessageableMembers, roleBadge } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import Link from "next/link";
import { ChevronRight, Mail } from "lucide-react";
import { PushPermission } from "@/components/messaging/PushPermission";
import RoleBadge from "@/components/ui/RoleBadge";

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

  const [clients, supabase] = await Promise.all([getAllMessageableMembers(user.id), createServerSupabase()]);
  const clientIds = clients.map((c) => c.id);

  const { data: lastMessages } = await supabase
    .from("messages")
    .select("conversation_id, content, type, created_at, is_read, receiver_id")
    .in("conversation_id", clientIds.length > 0 ? clientIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false });

  // Keep both the display-formatted time AND the raw ISO for sorting
  const msgMap: Record<string, { content: string; time: string; isoTime: string; unread: number }> = {};
  const seenConv = new Set<string>();

  for (const msg of (lastMessages ?? []) as LastMessage[]) {
    const cid = msg.conversation_id;
    if (!seenConv.has(cid)) {
      seenConv.add(cid);
      const content = msg.type === "voice" ? "🎤 Message vocal" : msg.content?.slice(0, 50) ?? "";
      const time = new Intl.DateTimeFormat("fr-FR", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      }).format(new Date(msg.created_at));
      msgMap[cid] = { content, time, isoTime: msg.created_at, unread: 0 };
    }
    if (!msg.is_read && msg.receiver_id === user.id) {
      if (msgMap[cid]) msgMap[cid].unread += 1;
    }
  }

  const clientsWithMsg = clients
    .map((c) => ({ ...c, msg: msgMap[c.id] ?? null }))
    .sort((a, b) => {
      if (!a.msg && !b.msg) return 0;
      if (!a.msg) return 1;
      if (!b.msg) return -1;
      // Sort by raw ISO timestamp, not formatted display string
      return new Date(b.msg.isoTime).getTime() - new Date(a.msg.isoTime).getTime();
    });

  const totalUnread = Object.values(msgMap).reduce((s, v) => s + v.unread, 0);

  return (
    <div className="page-transition" style={{ padding: "32px 20px 48px", maxWidth: 600, margin: "0 auto" }}>
      <PushPermission userId={user.id} />

      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Messagerie</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{
            fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em",
            color: "#F5EDED", margin: 0, lineHeight: 1.05,
          }}>
            Messages
          </h1>
          {totalUnread > 0 && (
            <span className="animate-pulse-glow" style={{
              background: "#E01E1E",
              color: "#fff",
              borderRadius: 20,
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 800,
            }}>
              {totalUnread}
            </span>
          )}
        </div>
        {!profile?.is_platform_owner && (
          <a
            href="mailto:peccoux.manu@gmail.com"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, color: "rgba(245,237,237,0.35)", fontSize: 11, textDecoration: "none" }}
          >
            <Mail size={11} />
            Une question pour le support ? peccoux.manu@gmail.com
          </a>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="ep-card" style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.35)", margin: 0 }}>Aucun membre encore</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {clientsWithMsg.map((client, i) => {
            const initials = (client.full_name ?? "?")
              .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

            return (
              <Link
                key={client.id}
                href={`/dashboard/coach/messages/${client.id}`}
                className="ep-card animate-fade-up ep-msg-row"
                style={{
                  animationDelay: `${i * 40}ms`,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  textDecoration: "none",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #E01E1E, #890404)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#F5EDED",
                  flexShrink: 0,
                  position: "relative",
                }}>
                  {initials}
                  {client.msg?.unread > 0 && (
                    <span style={{
                      position: "absolute",
                      top: -4, right: -4,
                      background: "#E01E1E",
                      border: "2px solid #0D0000",
                      borderRadius: "50%",
                      width: 16, height: 16,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 800, color: "#fff",
                    }}>
                      {client.msg.unread > 9 ? "9+" : client.msg.unread}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#F5EDED", display: "flex", alignItems: "center", gap: 6 }}>
                    {client.full_name ?? "Client"}
                    <RoleBadge label={roleBadge(client)} />
                  </p>
                  {client.msg ? (
                    <p style={{
                      margin: "2px 0 0",
                      fontSize: 11,
                      color: "rgba(245,237,237,0.35)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {client.msg.content}
                    </p>
                  ) : (
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.18)", fontStyle: "italic" }}>
                      Aucun message
                    </p>
                  )}
                </div>

                {/* Right */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  {client.msg && (
                    <span style={{ fontSize: 10, color: "rgba(245,237,237,0.22)" }}>
                      {client.msg.time}
                    </span>
                  )}
                  <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.2)" }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
