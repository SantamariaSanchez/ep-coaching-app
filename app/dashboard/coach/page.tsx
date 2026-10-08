import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getT, getLocale } from "@/lib/i18n-server";
import { intlLocale } from "@/lib/i18n";
import { isBlockOnDate } from "@/lib/agenda-day";
import { getUser, getProfile, getAllMessageableMembers } from "@/utils/auth";
import { getScheduleBlocks } from "@/utils/agenda";
import { getPendingReplies } from "@/utils/checkins";
import { getTopUrgentAlerts } from "@/lib/coach-analytics";
import { createServerSupabase } from "@/lib/supabase-server";
import { todayInParis, nowInParis, timeAwareGreeting } from "@/lib/dates";
import { messagePreview } from "@/components/messaging/message-format";
import IntentLauncher from "@/components/home/IntentLauncher";
import NowCard from "@/components/home/NowCard";
import InboxList, { type InboxItem } from "@/components/home/InboxList";
import { loadLauncher } from "@/lib/launcher-server";

// Accueil coach, version courte (2026-10-08, retour direct : « l'onglet est
// devenu un peu long, mets vraiment les choses utiles et pas juste des cards
// qui prennent tout l'espace, applique les principes d'ergonomie d'une vraie
// application »). Trois blocs seulement, du plus urgent au plus fréquent :
//   1. Maintenant / ensuite (une ligne, agenda)
//   2. Je veux (6 tuiles personnalisées, avec la réponse dessous)
//   3. À traiter (alertes clients, messages non lus, bilans sans réponse)
// Retirés : astuce du jour, cinq mini-cartes (nutrition, sommeil, live, pas :
// déjà dans les tuiles), raccourcis en doublon des tuiles, quatre grosses
// tuiles de stats et la grille complète des clients (onglet Clients). Moins
// de requêtes aussi : la page s'affiche avant que « À traiter » soit prêt.
export default async function CoachDashboard() {
  const user = await getUser();
  if (!user) redirect("/");

  const launcherP = loadLauncher(user.id, "coach");
  const [t, locale, profile, blocks] = await Promise.all([
    getT(),
    getLocale(user.id),
    getProfile(user.id),
    getScheduleBlocks(user.id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");

  // Onboarding coach : seulement un coach tiers déjà abonné, jamais le
  // fondateur, jamais avant paiement.
  if (
    profile?.role === "coach" &&
    !profile.is_platform_owner &&
    profile.platform_subscription_status === "active" &&
    !profile.onboarding_completed_at
  ) {
    redirect("/onboarding/coach");
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "Coach";
  const dateLabel = (() => {
    const s = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "long" }).format(new Date());
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  const todayStr = todayInParis();
  const { isoDow, hhmm } = nowInParis();
  const today = blocks.filter((b) => isBlockOnDate(b, todayStr, isoDow)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const current = today.find((b) => b.start_time <= hhmm && b.end_time > hhmm) ?? null;
  // Le prochain moment qui compte : on saute les longs blocs de travail.
  const next = today.find((b) => b.start_time > hhmm && b.icon !== "travail") ?? today.find((b) => b.start_time > hhmm) ?? null;
  const seance = today.find((b) => b.icon === "salle");
  const seanceLabel = seance?.label.replace(/^Séance\s*:\s*/i, "").trim() ?? null;

  return (
    <div className="page-transition ep-page-wide" style={{ padding: "20px 16px 40px" }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "rgba(245,237,237,0.45)" }}>{dateLabel}</p>
          <h1 className="ep-h1" style={{ margin: "2px 0 0", fontSize: 24 }}>
            {t(timeAwareGreeting(Number(hhmm.split(":")[0])))}, {firstName}
          </h1>
        </div>
        <span
          style={{
            flexShrink: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
            padding: "4px 9px", borderRadius: 999,
            color: seanceLabel ? "#E01E1E" : "#4ade80",
            background: seanceLabel ? "rgba(224,30,30,0.1)" : "rgba(74,222,128,0.1)",
            border: `1px solid ${seanceLabel ? "rgba(224,30,30,0.25)" : "rgba(74,222,128,0.25)"}`,
            maxWidth: 150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}
        >
          {seanceLabel ? `${t("Jour ON")} · ${seanceLabel}` : t("Jour OFF")}
        </span>
      </header>

      <NowCard
        href="/dashboard/coach/moi/agenda"
        current={current ? { label: current.label, until: current.end_time.slice(0, 5) } : null}
        next={next ? { label: next.label, at: next.start_time.slice(0, 5) } : null}
        labels={{ now: t("Maintenant"), next: t("Ensuite"), free: t("Rien de prévu dans ton agenda aujourd'hui"), until: t("jusqu'à"), at: t("à") }}
      />

      <IntentLauncher {...(await launcherP)} space="coach" />

      <Suspense fallback={<div className="ep-skeleton" style={{ height: 120, borderRadius: 14 }} />}>
        <CoachInbox userId={user.id} />
      </Suspense>
    </div>
  );
}

async function CoachInbox({ userId }: { userId: string }) {
  const t = await getT();
  const supabase = await createServerSupabase();
  const [alerts, pending, unread, messageable] = await Promise.all([
    getTopUrgentAlerts(userId, 3).catch(() => []),
    getPendingReplies(),
    supabase
      .from("messages")
      .select("id, conversation_id, content, type, created_at")
      .eq("receiver_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(50),
    getAllMessageableMembers(userId).catch(() => []),
  ]);

  const nameOf = new Map(messageable.map((m) => [m.id, m.full_name ?? t("Membre")]));
  const unreadRows = (unread.data ?? []) as { id: string; conversation_id: string; content: string | null; type: string }[];
  // Un message par personne : 5 messages de la même personne = une ligne.
  const byConv = new Map<string, { row: (typeof unreadRows)[number]; n: number }>();
  for (const m of unreadRows) {
    const e = byConv.get(m.conversation_id);
    if (e) e.n++;
    else byConv.set(m.conversation_id, { row: m, n: 1 });
  }

  const items: InboxItem[] = [
    ...alerts.map((a) => ({
      id: `a-${a.clientId}`,
      kind: (a.alert.severity === "high" ? "alert-high" : "alert") as InboxItem["kind"],
      title: a.clientName ?? t("Client"),
      sub: a.alert.label,
      href: `/dashboard/coach/clients/${a.clientId}`,
    })),
    ...[...byConv.values()].map(({ row, n }) => ({
      id: `m-${row.conversation_id}`,
      kind: "message" as const,
      title: n > 1 ? `${nameOf.get(row.conversation_id) ?? t("Membre")} (${n})` : nameOf.get(row.conversation_id) ?? t("Membre"),
      sub: messagePreview(row.type, row.content, 70),
      href: `/dashboard/coach/messages/${row.conversation_id}`,
    })),
    ...pending.map((c) => ({
      id: `b-${c.id}`,
      kind: "bilan" as const,
      title: c.profiles?.full_name ?? t("Client"),
      sub: t("Bilan semaine {n} sans réponse", { n: c.week_number }),
      href: `/dashboard/coach/clients/${c.client_id}/checkins`,
    })),
  ];

  return (
    <InboxList
      title={t("À traiter")}
      items={items.slice(0, 5)}
      total={items.length}
      moreHref={byConv.size > 0 && alerts.length === 0 ? "/dashboard/coach/messages" : "/dashboard/coach/prioritaires"}
      moreLabel={t("Tout voir")}
      emptyLabel={t("Rien à traiter. Tout est à jour.")}
    />
  );
}
