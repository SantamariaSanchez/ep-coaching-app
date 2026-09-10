import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getAllCoaches, getAllActiveClientsSystemWide } from "@/utils/auth";
import { getCoachBillingInfo, type CoachBillingInfo } from "@/lib/coach-billing";
import { createAdminClient } from "@/lib/supabase-admin";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import { COACH_PLATFORM_PLANS } from "@/lib/coach-platform-plan";
import { todayInParis } from "@/lib/dates";
import { ChevronLeft, TrendingUp, Users, Crown, History, ExternalLink, ArrowUp, ArrowDown, Minus } from "lucide-react";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function eur(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + "€";
}

function mrrOf(billing: (CoachBillingInfo | null)[]): number {
  return billing.reduce((sum, b) => {
    if (!b || !b.amount || !b.intervalMonths) return sum;
    if (b.status !== "active" && b.status !== "trialing") return sum;
    return sum + b.amount / b.intervalMonths;
  }, 0);
}

function StatCard({ label, value, sub, color = "#F5EDED" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="ep-card" style={{ padding: "14px 16px" }}>
      <p className="ep-label" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 900, color, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.35)", margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

export default async function CoachFinancePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const [coaches, activeClients] = await Promise.all([
    getAllCoaches(),
    getAllActiveClientsSystemWide(),
  ]);

  const [coachBilling, clientBilling] = await Promise.all([
    Promise.all(coaches.map((c) => getCoachBillingInfo(c.platform_stripe_customer_id, c.platform_stripe_subscription_id))),
    Promise.all(activeClients.map((c) => getCoachBillingInfo(c.stripe_customer_id, c.stripe_subscription_id))),
  ]);

  const coachMrr = mrrOf(coachBilling);
  const clientMrr = mrrOf(clientBilling);
  const totalMrr = coachMrr + clientMrr;

  const coachesActive = coachBilling.filter((b) => b?.status === "active").length;
  const coachesTrialing = coachBilling.filter((b) => b?.status === "trialing").length;
  const clientsWithStripe = clientBilling.filter((b) => b != null && b.amount != null).length;
  const clientsManual = activeClients.length - clientsWithStripe;

  // Historique récent : changements de statut d'abonnement client, journalisés
  // à chaque bascule manuelle par un coach (voir SubscriptionToggle) — la
  // seule trace d'historique déjà disponible sans re-solliciter Stripe.
  const admin = createAdminClient();
  const { data: recentEvents } = await admin
    .from("subscription_events")
    .select("id, status, plan, note, created_at, client_id")
    .order("created_at", { ascending: false })
    .limit(12);

  const clientIds = [...new Set((recentEvents ?? []).map((e) => e.client_id))];
  const { data: eventProfiles } = clientIds.length > 0
    ? await admin.from("profiles").select("id, full_name").in("id", clientIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((eventProfiles ?? []).map((p) => [p.id, p.full_name ?? "Client"]));

  // Nouveau (retour direct 2026-09-09, "ajoute des fonctionnalités auxquelles
  // on n'a pas encore pensé" sur Finance) : un chiffre de MRR sans repère ne
  // dit rien de la direction — même logique de tendance déjà utilisée sur
  // le tableau de bord (DashboardStats, Check-ins/sem.). Stripe ne donne que
  // l'état ACTUEL d'un abonnement, jamais son historique par mois ; le
  // journal subscription_events (déjà déclenché à chaque bascule) sert donc
  // de proxy fiable pour "combien d'activations ce mois vs le mois dernier".
  const thisMonthPrefix = todayInParis().slice(0, 7);
  const lastMonthDate = new Date(thisMonthPrefix + "-01T12:00:00");
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthPrefix = lastMonthDate.toISOString().slice(0, 7);
  const { data: activationEvents } = await admin
    .from("subscription_events")
    .select("created_at")
    .eq("status", "active")
    .gte("created_at", `${lastMonthPrefix}-01`);
  const activationsThisMonth = (activationEvents ?? []).filter((e) => (e.created_at as string).startsWith(thisMonthPrefix)).length;
  const activationsLastMonth = (activationEvents ?? []).filter((e) => (e.created_at as string).startsWith(lastMonthPrefix)).length;
  const activationsDelta = activationsThisMonth - activationsLastMonth;
  const TrendIcon = activationsDelta > 0 ? ArrowUp : activationsDelta < 0 ? ArrowDown : Minus;
  const trendColor = activationsDelta > 0 ? "#4ade80" : activationsDelta < 0 ? "#fb923c" : "rgba(245,237,237,0.35)";

  // Nouveau : un essai qui va expirer est un signal d'action (relancer avant
  // le churn), pas juste une statistique — rien ne le mettait en évidence
  // jusqu'ici, noyé dans la simple liste "En essai" ci-dessous.
  const now = Date.now();
  const expiringTrials = coaches
    .map((c, i) => ({ coach: c, billing: coachBilling[i] }))
    .filter((x) => x.billing?.status === "trialing" && x.billing.trialEnd)
    .map((x) => ({ ...x, daysLeft: Math.ceil((new Date(x.billing!.trialEnd!).getTime() - now) / 86_400_000) }))
    .filter((x) => x.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <Link
        href="/dashboard/coach"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={13} /> Retour
      </Link>

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Administration
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Finance</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Revenus réels traités par Stripe. Abonnements plateforme des coachs tiers et abonnements
          directs des clients. Les paiements gérés hors app (lien externe d&apos;un coach, virement) n&apos;y
          figurent pas.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Revenu mensuel total" value={eur(totalMrr)} color="#4ade80" sub="Revenu mensuel récurrent" />
        <StatCard label="Abonnés actifs" value={String(coachesActive + activeClients.length)} sub={`${coachesActive} coach${coachesActive !== 1 ? "s" : ""} · ${activeClients.length} client${activeClients.length !== 1 ? "s" : ""}`} />
        <StatCard label="Revenu mensuel plateforme (coachs)" value={eur(coachMrr)} />
        <StatCard label="Revenu mensuel clients (direct)" value={eur(clientMrr)} />
      </div>

      {/* Nouveau : tendance d'activations, sans repère un MRR isolé ne dit
          rien de la direction (croissance ou ralentissement). */}
      <div className="ep-card" style={{ padding: "14px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p className="ep-label" style={{ marginBottom: 4 }}>Activations ce mois-ci</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{activationsThisMonth}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: trendColor, fontSize: 12, fontWeight: 800 }}>
          <TrendIcon size={13} strokeWidth={2.5} />
          {activationsDelta === 0 ? "stable" : `${activationsDelta > 0 ? "+" : ""}${activationsDelta} vs mois dernier`}
        </div>
      </div>

      {/* Nouveau : essais qui expirent dans moins de 7 jours — le moment où
          relancer un coach avant qu'il churn, pas après. */}
      {expiringTrials.length > 0 && (
        <section className="mb-6">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400/80 mb-3">
            <Crown size={12} /> Essais qui expirent bientôt
          </p>
          <div className="space-y-2">
            {expiringTrials.map(({ coach, daysLeft }) => (
              <Link
                key={coach.id}
                href="/dashboard/coach/admin"
                className="ep-card flex items-center justify-between gap-3"
                style={{ padding: "12px 16px" }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>{coach.full_name ?? "Sans nom"}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.4)" }}>{coach.email}</p>
                </div>
                <span style={{
                  fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em",
                  color: daysLeft <= 2 ? "#E01E1E" : "#facc15",
                  border: `1px solid ${daysLeft <= 2 ? "#E01E1E" : "#facc15"}55`, borderRadius: 999, padding: "3px 9px",
                  flexShrink: 0,
                }}>
                  {daysLeft <= 0 ? "Aujourd'hui" : daysLeft === 1 ? "Demain" : `${daysLeft} jours`}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Coachs tiers */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
            <Crown size={12} className="text-[#E01E1E]" /> Abonnements plateforme (coachs tiers)
          </p>
          <Link href="/dashboard/coach/admin" className="text-[10px] font-bold text-[#E01E1E] hover:text-[#ff4444]">
            Gérer →
          </Link>
        </div>
        <div className="ep-card" style={{ padding: "14px 16px" }}>
          {coaches.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.35)" }}>Aucun coach tiers inscrit pour l&apos;instant.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="ep-label" style={{ marginBottom: 2 }}>Actifs</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#4ade80", margin: 0 }}>{coachesActive}</p>
              </div>
              <div>
                <p className="ep-label" style={{ marginBottom: 2 }}>En essai</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#facc15", margin: 0 }}>{coachesTrialing}</p>
              </div>
              <div>
                <p className="ep-label" style={{ marginBottom: 2 }}>Total inscrits</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#F5EDED", margin: 0 }}>{coaches.length}</p>
              </div>
            </div>
          )}
          <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.3)", marginTop: 10 }}>
            {COACH_PLATFORM_PLANS.map((p) => p.priceLabel).join(" · ")}
          </p>
        </div>
      </section>

      {/* Clients directs */}
      <section className="mb-6">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          <Users size={12} className="text-[#E01E1E]" /> Abonnements clients (paiement direct)
        </p>
        <div className="ep-card" style={{ padding: "14px 16px" }}>
          {activeClients.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.35)" }}>Aucun client payant pour l&apos;instant.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="ep-label" style={{ marginBottom: 2 }}>Via Stripe</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#4ade80", margin: 0 }}>{clientsWithStripe}</p>
              </div>
              <div>
                <p className="ep-label" style={{ marginBottom: 2 }}>Activés manuellement</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#F5EDED", margin: 0 }}>{clientsManual}</p>
              </div>
            </div>
          )}
          <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.3)", marginTop: 10 }}>
            {SUBSCRIPTION_PLANS.map((p) => p.priceLabel).join(" · ")}
          </p>
        </div>
      </section>

      {/* Historique */}
      <section>
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          <History size={12} className="text-[#E01E1E]" /> Historique récent
        </p>
        {!recentEvents || recentEvents.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.3)" }}>Aucun changement de statut pour l&apos;instant.</p>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((e) => (
              <div key={e.id} className="ep-card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <TrendingUp size={13} style={{ color: e.status === "active" ? "#4ade80" : "rgba(245,237,237,0.3)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: "#F5EDED", margin: 0 }}>
                    <strong>{nameById.get(e.client_id) ?? "Client"}</strong>{" "}
                    {e.status === "active" ? "activé" : e.status === "canceled" ? "résilié" : "repassé gratuit"}
                    {e.plan ? ` · ${e.plan}` : ""}
                  </p>
                  {e.note && <p style={{ fontSize: 11, color: "rgba(245,237,237,0.4)", margin: "2px 0 0" }}>{e.note}</p>}
                </div>
                <span style={{ fontSize: 10.5, color: "rgba(245,237,237,0.25)", flexShrink: 0 }}>
                  {formatDate(e.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p style={{ fontSize: 10, color: "rgba(245,237,237,0.2)", marginTop: 20, display: "flex", alignItems: "center", gap: 4 }}>
        <ExternalLink size={10} /> Détail complet des paiements sur le{" "}
        <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" style={{ color: "#E01E1E" }}>
          dashboard Stripe
        </a>.
      </p>
    </div>
  );
}
