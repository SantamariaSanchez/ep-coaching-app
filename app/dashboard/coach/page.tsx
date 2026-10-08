import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getT, getLocale } from "@/lib/i18n-server";
import { intlLocale } from "@/lib/i18n";
import { getUser, getProfile, getAllMessageableMembers } from "@/utils/auth";
import { getPendingReplies } from "@/utils/checkins";
import { getCoachAlertsCached } from "@/lib/coach-analytics";
import { createServerSupabase } from "@/lib/supabase-server";
import { nowInParis, timeAwareGreeting } from "@/lib/dates";
import { messagePreview } from "@/components/messaging/message-format";
import IntentLauncher from "@/components/home/IntentLauncher";
import InboxList, { type InboxItem } from "@/components/home/InboxList";
import QuickNote from "@/components/home/QuickNote";
import { AgendaW, MealW, WorkoutW, LiveW, StatsW, DeskW, ContentW, WidgetSkeleton } from "@/components/home/Widgets";
import { loadLauncherLite } from "@/lib/launcher-server";

// Accueil coach en widgets (2026-10-08, retour direct : « j'ouvre l'appli,
// direct j'ai l'agenda, mes clients, mes lives, mon repas, prendre des
// notes, mes stats organiques, ce qu'il me faut pour moi, pas tous les
// boutons n'importe comment »). Chaque carte montre l'info elle-même (le
// repas avec ses grammes, la séance avec ses exercices, les abonnés avec la
// courbe...), et charge seule dans sa Suspense : la page s'affiche tout de
// suite. Tout le reste de l'appli reste à un geste via le bouton grille.
export default async function CoachDashboard() {
  const user = await getUser();
  if (!user) redirect("/");

  const [t, locale, profile, launcher] = await Promise.all([getT(), getLocale(user.id), getProfile(user.id), loadLauncherLite(user.id, "coach")]);

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
  const { hhmm } = nowInParis();
  const id = user.id;
  const isOwner = !!profile?.is_platform_owner;
  // Créateur ou business : stats et contenu remontent avant les clients.
  const contentFirst = launcher.persona.key === "coach_createur" || launcher.persona.key === "coach_business";


  const clients = (
    <div style={pair}>
      <W h={120}><DeskW userId={id} isOwner={isOwner} href="/dashboard/coach/clients" /></W>
      <W h={120}><LiveW userId={id} role="coach" coachId={null} href="/dashboard/coach/live" /></W>
    </div>
  );
  const content = (
    <>
      <W h={130}><StatsW userId={id} href="/dashboard/coach/stats-reseaux" /></W>
      <W h={90}><ContentW userId={id} href="/dashboard/coach/studio?onglet=scripts" /></W>
    </>
  );

  return (
    <div className="page-transition ep-page-medium" style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "rgba(245,237,237,0.45)" }}>{dateLabel}</p>
          <h1 className="ep-h1" style={{ margin: "2px 0 0", fontSize: 24, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t(timeAwareGreeting(Number(hhmm.split(":")[0])))}, {firstName}
          </h1>
        </div>
        <IntentLauncher {...launcher} space="coach" variant="button" />
      </header>

      <W h={120}><AgendaW userId={id} href="/dashboard/coach/moi/agenda" /></W>

      <div style={pair}>
        <W h={130}><MealW userId={id} href="/dashboard/coach/moi/nutrition" /></W>
        <W h={130}><WorkoutW userId={id} href="/dashboard/coach/moi/programme" /></W>
      </div>

      <QuickNote notesHref="/dashboard/coach/notes" />

      {contentFirst ? content : clients}
      {contentFirst ? clients : content}

      <Suspense fallback={null}>
        <CoachInbox userId={id} />
      </Suspense>
    </div>
  );
}

function W({ children, h }: { children: React.ReactNode; h?: number }) {
  return <Suspense fallback={<WidgetSkeleton h={h} />}>{children}</Suspense>;
}
const pair: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, alignItems: "stretch" };

async function CoachInbox({ userId }: { userId: string }) {
  const t = await getT();
  const supabase = await createServerSupabase();
  const [alerts, pending, unread, messageable] = await Promise.all([
    getCoachAlertsCached(userId).catch(() => []),
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
  // Rien à traiter : rien du tout (pas de bandeau « tout va bien » en plus).
  if (!items.length) return null;

  return (
    <div style={{ marginTop: 6 }}>
      <InboxList
        title={t("À traiter")}
        items={items.slice(0, 5)}
        total={items.length}
        moreHref={byConv.size > 0 && alerts.length === 0 ? "/dashboard/coach/messages" : "/dashboard/coach/prioritaires"}
        moreLabel={t("Tout voir")}
        emptyLabel=""
      />
    </div>
  );
}
