import { redirect } from "next/navigation";
import { getUser, getProfile, getAllMessageableMembers, roleBadge } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { Mail } from "lucide-react";
import { PushPermission } from "@/components/messaging/PushPermission";
import CoachConversationsList, { type ConversationRow } from "@/components/messaging/CoachConversationsList";
import { formatListTime, messagePreview } from "@/components/messaging/message-format";

interface LastMessage {
  conversation_id: string;
  sender_id: string;
  content: string | null;
  type: string;
  created_at: string;
}

// Au-delà, PostgREST tronque silencieusement la réponse (max-rows). Le scan
// des derniers messages est borné explicitement : si la borne est atteinte,
// les conversations absentes du scan sont complétées une par une plus bas,
// au lieu de s'afficher à tort "Aucun message".
const LAST_MESSAGES_SCAN_LIMIT = 1000;
const NO_CONVERSATION = ["00000000-0000-0000-0000-000000000000"];

export default async function CoachMessagesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const [members, supabase] = await Promise.all([getAllMessageableMembers(user.id), createServerSupabase()]);
  // getAllMessageableMembers exclut déjà le coach lui-même (double rôle du
  // fondateur, coach_id = son propre id) ; filtre gardé ici en défense en
  // profondeur, une conversation avec soi-même n'a rien à faire dans la liste.
  const clients = members.filter((c) => c.id !== user.id);
  const clientIds = clients.length > 0 ? clients.map((c) => c.id) : NO_CONVERSATION;

  const [lastRes, unreadRes] = await Promise.all([
    supabase
      .from("messages")
      .select("conversation_id, sender_id, content, type, created_at")
      .in("conversation_id", clientIds)
      .order("created_at", { ascending: false })
      .limit(LAST_MESSAGES_SCAN_LIMIT),
    // Non lus comptés par une requête dédiée (et pas déduits du scan
    // ci-dessus) : le compteur reste exact même si le scan est tronqué.
    supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", clientIds)
      .eq("receiver_id", user.id)
      .eq("is_read", false),
  ]);

  const loadError = !!lastRes.error || !!unreadRes.error;
  if (lastRes.error) console.error("CoachMessagesPage last messages error:", lastRes.error.message);
  if (unreadRes.error) console.error("CoachMessagesPage unread error:", unreadRes.error.message);

  // Dernier message de chaque conversation (le scan est trié du plus récent
  // au plus ancien : la première occurrence d'une conversation est la bonne).
  const lastByConv: Record<string, LastMessage> = {};
  const scanned = (lastRes.data ?? []) as LastMessage[];
  for (const msg of scanned) {
    if (!lastByConv[msg.conversation_id]) lastByConv[msg.conversation_id] = msg;
  }

  if (scanned.length >= LAST_MESSAGES_SCAN_LIMIT) {
    const missing = clients.filter((c) => !lastByConv[c.id]).map((c) => c.id);
    const extra = await Promise.all(
      missing.map((cid) =>
        supabase
          .from("messages")
          .select("conversation_id, sender_id, content, type, created_at")
          .eq("conversation_id", cid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      )
    );
    for (const res of extra) {
      const msg = res.data as LastMessage | null;
      if (msg) lastByConv[msg.conversation_id] = msg;
    }
  }

  const unreadByConv: Record<string, number> = {};
  for (const row of (unreadRes.data ?? []) as { conversation_id: string }[]) {
    unreadByConv[row.conversation_id] = (unreadByConv[row.conversation_id] ?? 0) + 1;
  }

  const now = new Date();
  const clientsWithMsg = clients
    .map((c) => ({ ...c, msg: lastByConv[c.id] ?? null }))
    .sort((a, b) => {
      if (!a.msg && !b.msg) return 0;
      if (!a.msg) return 1;
      if (!b.msg) return -1;
      // Tri sur l'horodatage ISO brut, jamais sur le libellé affiché
      return new Date(b.msg.created_at).getTime() - new Date(a.msg.created_at).getTime();
    });

  const totalUnread = Object.values(unreadByConv).reduce((s, v) => s + v, 0);

  // Le rendu de la liste (recherche, filtres) vit dans un Client Component :
  // la page reste un Server Component pour la lecture des messages.
  const rows: ConversationRow[] = clientsWithMsg.map((c) => ({
    id: c.id,
    fullName: c.full_name,
    badge: roleBadge(c),
    // "Toi : " quand le dernier mot est celui du coach : d'un coup d'oeil,
    // on sait quelles conversations attendent une réponse de sa part.
    lastContent: c.msg
      ? `${c.msg.sender_id === user.id ? "Toi : " : ""}${messagePreview(c.msg.type, c.msg.content)}`
      : null,
    lastTime: c.msg ? formatListTime(c.msg.created_at, now) : null,
    unread: unreadByConv[c.id] ?? 0,
  }));

  return (
    <div className="page-transition ep-page-medium" style={{ padding: "32px 20px 48px" }}>
      <PushPermission userId={user.id} />

      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Messagerie</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 className="ep-h1">
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

      {loadError && (
        <div
          role="alert"
          className="ep-card"
          style={{ padding: "12px 16px", marginBottom: 14, borderColor: "rgba(224,30,30,0.4)" }}
        >
          <p style={{ fontSize: 12, color: "#F5EDED", margin: 0, fontWeight: 700 }}>
            Impossible de charger les derniers messages.
          </p>
          <p style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", margin: "2px 0 0" }}>
            Les aperçus et les non lus peuvent être incomplets. Recharge la page dans un instant.
          </p>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="ep-card" style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(245,237,237,0.55)", margin: "0 0 4px" }}>
            Aucun membre pour l&apos;instant
          </p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: 0 }}>
            Dès qu&apos;un membre rejoint ta communauté, sa conversation apparaît ici.
          </p>
        </div>
      ) : (
        <CoachConversationsList rows={rows} />
      )}
    </div>
  );
}
