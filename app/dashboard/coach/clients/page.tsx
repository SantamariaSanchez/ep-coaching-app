import { redirect } from "next/navigation";
import { getUser, getProfile, getClients, isSubscribed } from "@/utils/auth";
import { getPointsMap } from "@/lib/gamification";
import { isEligibleForLegendReward } from "@/lib/gamification-types";
import { getCoachingPhaseOverview } from "@/lib/coaching-phase";
import { getClientsLastActivity, getClientsWeeklyConsistency } from "@/lib/client-activity";
import { getClientsIntakeCompletion } from "@/utils/client-intake";
import { relaunchMember } from "@/app/dashboard/coach/communaute/membres/actions";
import ClientsSection from "@/components/ui/ClientsSection";
import Link from "next/link";
import { ClipboardCheck, Dumbbell, Camera, ChevronRight } from "lucide-react";
import ClientsHubBar from "@/components/coach/ClientsHubBar";
import { getCoachInbox } from "@/lib/coach-inbox";
import { createServerSupabase } from "@/lib/supabase-server";

const TYPE_ICON = { checkin: ClipboardCheck, correction: Dumbbell, photo: Camera } as const;

export default async function ClientsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const [profile, clients] = await Promise.all([
    getProfile(user.id),
    getClients(user.id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");

  const clientIds = clients.map((c) => c.id);
  const supabase = await createServerSupabase();
  // Boîte de réception et signaux clients lus ensemble (perf 2026-11-14).
  const [inbox, unread, pointsMap, phaseOverview, activity, intakeComplete, weeklyConsistency] = await Promise.all([
    getCoachInbox(user.id),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false),
    getPointsMap(clientIds),
    // Coach exclusivement — repère qui décroche ou est prêt à changer de
    // phase sans avoir à ouvrir chaque fiche (voir ClientCard alerts).
    getCoachingPhaseOverview(clientIds),
    // Silence depuis combien de temps (entraînement/nutrition/bilan) —
    // distinct des suggestions de phase ci-dessus, voir ClientCard.
    getClientsLastActivity(clientIds),
    // Entonnoir d'onboarding (item 14) : qui n'a jamais fini sa fiche client.
    getClientsIntakeCompletion(clientIds),
    // Item 36 : score de constance unique de la semaine en cours, distinct
    // du silence ci-dessus (qui regarde 35 jours en arrière).
    getClientsWeeklyConsistency(clientIds),
  ]);
  const ouraEligibleIds = clients
    .filter((c) => isEligibleForLegendReward(pointsMap[c.id] ?? 0, isSubscribed(c)))
    .map((c) => c.id);

  return (
    <div className="page-transition ep-page-wide" style={{ padding: "16px 16px 48px" }}>
      <ClientsHubBar inviteCode={profile?.invite_code ?? null} coachFirstName={profile?.full_name?.split(" ")[0] ?? null} unread={unread.count ?? 0} />

      {/* À traiter : bilans, corrections et photos en attente (ex-Boîte de réception). */}
      {inbox.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
          {inbox.slice(0, 5).map((item) => {
            const Icon = TYPE_ICON[item.type];
            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                className="ep-press"
                style={{
                  display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "8px 12px", borderRadius: 12,
                  background: "var(--ep-s2)", border: "1px solid rgba(var(--ep-accent-rgb),0.12)", textDecoration: "none",
                }}
              >
                <Icon size={15} style={{ color: "var(--ep-accent)", flexShrink: 0 }} strokeWidth={1.8} />
                <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--ep-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <strong style={{ fontWeight: 800 }}>{item.clientName}</strong>
                  <span style={{ color: "rgba(var(--ep-ink-rgb),0.5)" }}> · {item.detail}</span>
                </p>
                <ChevronRight size={14} style={{ color: "rgba(var(--ep-ink-rgb),0.25)", flexShrink: 0 }} />
              </Link>
            );
          })}
          {inbox.length > 5 && (
            <Link href="/dashboard/coach/inbox" style={{ fontSize: 12, fontWeight: 700, color: "var(--ep-accent)", textDecoration: "none", padding: "4px 2px" }}>
              +{inbox.length - 5}
            </Link>
          )}
        </div>
      )}

      <ClientsSection
        hideTitle
        clients={clients}
        ouraEligibleIds={ouraEligibleIds}
        phaseOverview={phaseOverview}
        activity={activity}
        intakeComplete={intakeComplete}
        weeklyConsistency={weeklyConsistency}
        relaunchMember={relaunchMember}
      />
    </div>
  );
}
