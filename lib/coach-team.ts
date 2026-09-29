import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";

// Équipes de coachs (voir supabase/migrations/20260930_coach_teams.sql).
// Lectures en service role, toujours filtrées sur l'utilisateur connecté
// passé par la page (jamais un id venu du navigateur).

export interface TeamCoachLink {
  id: string;
  owner_id: string;
  coach_id: string | null;
  email: string;
  title: string | null;
  share_pct: number | null;
  status: "invite" | "actif" | "refuse" | "termine";
  note: string | null;
  created_at: string;
  accepted_at: string | null;
}

export interface TeamCoachStats {
  name: string;
  clients: number;
  paying: number;
  bilansToday: number;
  checkinsWaiting: number;
  newThisMonth: number;
}

const LINK_FIELDS = "id, owner_id, coach_id, email, title, share_pct, status, note, created_at, accepted_at";

/** Les coachs de mon équipe, avec leurs chiffres clés. */
export async function getOwnedCoachTeam(ownerId: string): Promise<{ links: TeamCoachLink[]; stats: Record<string, TeamCoachStats> }> {
  const admin = createAdminClient();
  const { data } = await admin.from("coach_team_links").select(LINK_FIELDS).eq("owner_id", ownerId).in("status", ["invite", "actif"]).order("created_at");
  const links = ((data ?? []) as TeamCoachLink[]).map((l) => ({ ...l, share_pct: l.share_pct === null ? null : Number(l.share_pct) }));
  const coachIds = links.filter((l) => l.status === "actif" && l.coach_id).map((l) => l.coach_id as string);
  const stats: Record<string, TeamCoachStats> = {};
  if (!coachIds.length) return { links, stats };

  const today = todayInParis();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [{ data: coaches }, { data: clients }] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", coachIds),
    admin.from("profiles").select("id, coach_id, subscription_status, start_date").eq("role", "client").in("coach_id", coachIds).limit(5000),
  ]);
  const clientRows = (clients ?? []) as { id: string; coach_id: string; subscription_status: string | null; start_date: string | null }[];
  const clientIds = clientRows.map((c) => c.id);
  const [{ data: logs }, { data: checkins }] = clientIds.length
    ? await Promise.all([
        admin.from("daily_logs").select("client_id").eq("log_date", today).in("client_id", clientIds),
        admin.from("check_ins").select("client_id").is("coach_replied_at", null).gte("week_start", shiftDays(today, -21)).in("client_id", clientIds),
      ])
    : [{ data: [] }, { data: [] }];
  const coachOf = new Map(clientRows.map((c) => [c.id, c.coach_id]));
  for (const id of coachIds) {
    const mine = clientRows.filter((c) => c.coach_id === id);
    stats[id] = {
      name: ((coaches ?? []) as { id: string; full_name: string | null }[]).find((c) => c.id === id)?.full_name ?? "Coach",
      clients: mine.length,
      paying: mine.filter((c) => c.subscription_status === "active").length,
      bilansToday: new Set(((logs ?? []) as { client_id: string }[]).filter((l) => coachOf.get(l.client_id) === id).map((l) => l.client_id)).size,
      checkinsWaiting: ((checkins ?? []) as { client_id: string }[]).filter((c) => coachOf.get(c.client_id) === id).length,
      newThisMonth: mine.filter((c) => (c.start_date ?? "") >= monthStart).length,
    };
  }
  return { links, stats };
}

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Les équipes que je rejoins (actives) et les invitations qui m'attendent. */
export async function getMyCoachMemberships(userId: string, email: string | null): Promise<{ active: (TeamCoachLink & { ownerName: string })[]; invites: (TeamCoachLink & { ownerName: string })[] }> {
  const admin = createAdminClient();
  const [{ data: act }, { data: inv }] = await Promise.all([
    admin.from("coach_team_links").select(LINK_FIELDS).eq("coach_id", userId).eq("status", "actif"),
    email ? admin.from("coach_team_links").select(LINK_FIELDS).eq("status", "invite").eq("email", email.trim().toLowerCase()) : Promise.resolve({ data: [] }),
  ]);
  const all = [...((act ?? []) as TeamCoachLink[]), ...((inv ?? []) as TeamCoachLink[])];
  const ownerIds = [...new Set(all.map((l) => l.owner_id))];
  const { data: owners } = ownerIds.length ? await admin.from("profiles").select("id, full_name").in("id", ownerIds) : { data: [] };
  const nameOf = (id: string) => ((owners ?? []) as { id: string; full_name: string | null }[]).find((o) => o.id === id)?.full_name ?? "Un coach";
  return {
    active: ((act ?? []) as TeamCoachLink[]).map((l) => ({ ...l, ownerName: nameOf(l.owner_id) })),
    invites: ((inv ?? []) as TeamCoachLink[]).filter((l) => l.owner_id !== userId).map((l) => ({ ...l, ownerName: nameOf(l.owner_id) })),
  };
}

export interface StaffOverview {
  members: { user_id: string; role_key: string; full_name: string; email: string; status: string; created_at: string }[];
  invites: { id: string; role_key: string; email: string; created_at: string }[];
}

/** Le staff (métiers hors coaching) de mon entreprise. */
export async function getStaffOverview(ownerId: string): Promise<StaffOverview> {
  const admin = createAdminClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    admin.from("staff_members").select("user_id, role_key, full_name, email, status, created_at").eq("owner_id", ownerId).order("created_at"),
    admin.from("staff_invites").select("id, role_key, email, created_at").eq("owner_id", ownerId).is("used_at", null).order("created_at", { ascending: false }),
  ]);
  return { members: (members ?? []) as StaffOverview["members"], invites: (invites ?? []) as StaffOverview["invites"] };
}
