import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyAdmin } from "@/lib/admin-notify";

// Déclenché par Supabase pg_cron une fois par jour. Repère les messages
// envoyés à un coach il y a 24 à 48h et toujours non lus (= probablement
// sans réponse) pour prévenir le fondateur — un client qui n'a pas de
// retour se désengage vite. Fenêtre de 24h glissante pour ne signaler
// chaque message qu'une seule fois (pas de nouvelle colonne nécessaire).
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = Date.now();
  const from = new Date(now - 48 * 3600 * 1000).toISOString();
  const to = new Date(now - 24 * 3600 * 1000).toISOString();

  const { data: staleMessages } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, content, created_at")
    .eq("is_read", false)
    .gte("created_at", from)
    .lt("created_at", to);

  if (!staleMessages || staleMessages.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // On ne garde que les messages dont le destinataire est un coach (un
  // client sans réponse de son coach, pas l'inverse — le fondateur veut
  // être alerté quand SES coachs laissent traîner, pas quand un client
  // met du temps à répondre à son coach).
  const receiverIds = [...new Set(staleMessages.map((m) => m.receiver_id as string))];
  const { data: receivers } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .in("id", receiverIds)
    .eq("role", "coach");

  const coachById = new Map((receivers ?? []).map((r) => [r.id as string, r]));
  const relevant = staleMessages.filter((m) => coachById.has(m.receiver_id as string));

  if (relevant.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const senderIds = [...new Set(relevant.map((m) => m.sender_id as string))];
  const { data: senders } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", senderIds);
  const senderById = new Map((senders ?? []).map((s) => [s.id as string, s]));

  const byCoach = new Map<string, typeof relevant>();
  for (const m of relevant) {
    const list = byCoach.get(m.receiver_id as string) ?? [];
    list.push(m);
    byCoach.set(m.receiver_id as string, list);
  }

  let notified = 0;
  for (const [coachId, msgs] of byCoach) {
    const coach = coachById.get(coachId);
    const lines = msgs.map((m) => {
      const sender = senderById.get(m.sender_id as string);
      const preview = (m.content ?? "(média)").slice(0, 80);
      return `${sender?.full_name ?? "Un membre"} → ${coach?.full_name ?? "coach"} : "${preview}"`;
    });
    await notifyAdmin("Messages sans réponse depuis plus de 24h", [
      `Coach concerné : <strong>${coach?.full_name ?? coachId}</strong> (${coach?.email ?? ""})`,
      ...lines,
    ]).catch(() => {});
    notified++;
  }

  return NextResponse.json({ ok: true, notified, checked: relevant.length });
}
