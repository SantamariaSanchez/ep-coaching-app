// Données des widgets de l'accueil (2026-10-08, retour direct : « j'ouvre
// l'appli, direct j'ai l'agenda, mes clients, mes lives, mon repas, prendre
// des notes, mes stats organiques, vraiment ce qu'il me faut, et pas tous les
// boutons n'importe comment »). Chaque fonction lit le strict minimum, ne
// lève jamais d'erreur (null = widget masqué) et tourne en parallèle des
// autres : la page s'affiche tout de suite, chaque widget arrive dès qu'il
// est prêt.
import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis, nowInParis } from "@/lib/dates";
import { isBlockOnDate } from "@/lib/agenda-day";
import { getActivePlan } from "@/lib/nutrition-sync";
import { MEAL_SLOTS, SLOT_END, planItemsFor, slotLabel } from "@/lib/nutrition-engine";
import { getScheduleBlocks } from "@/utils/agenda";
import { getActiveProgram } from "@/utils/programs";
import type { ScheduleBlock } from "@/utils/agenda";

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.error("home widget error:", e);
    return null;
  }
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Agenda ─────────────────────────────────────────────────────────────────

export interface AgendaWidget {
  current: { label: string; start: string; end: string; icon: string | null; progress: number } | null;
  upcoming: { label: string; start: string; icon: string | null }[];
  seance: string | null;
  total: number;
}

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export function buildAgenda(blocks: ScheduleBlock[]): AgendaWidget {
  const today = todayInParis();
  const { isoDow, hhmm } = nowInParis();
  const list = blocks.filter((b) => isBlockOnDate(b, today, isoDow)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const cur = list.find((b) => b.start_time.slice(0, 5) <= hhmm && b.end_time.slice(0, 5) > hhmm) ?? null;
  const upcoming = list.filter((b) => b.start_time.slice(0, 5) > hhmm).slice(0, 3);
  const seance = list.find((b) => b.icon === "salle");
  return {
    current: cur
      ? {
          label: cur.label,
          start: cur.start_time.slice(0, 5),
          end: cur.end_time.slice(0, 5),
          icon: cur.icon,
          progress: Math.max(0, Math.min(1, (toMin(hhmm) - toMin(cur.start_time)) / Math.max(1, toMin(cur.end_time) - toMin(cur.start_time)))),
        }
      : null,
    upcoming: upcoming.map((b) => ({ label: b.label, start: b.start_time.slice(0, 5), icon: b.icon })),
    seance: seance ? seance.label.replace(/^Séance\s*:\s*/i, "").trim() : null,
    total: list.length,
  };
}

export async function loadAgenda(userId: string): Promise<AgendaWidget> {
  return buildAgenda(await getScheduleBlocks(userId));
}

// ── Repas ──────────────────────────────────────────────────────────────────

export interface MealWidget {
  slot: string;
  label: string;
  until: string;
  foods: { name: string; grams: number }[];
  kcal: number;
  left: number; // repas restants aujourd'hui, celui-ci compris
}

/**
 * Le prochain repas PAR L'HEURE (la journée est pré-remplie avec le plan à
 * l'ouverture, « non noté » ne veut donc rien dire). Quantités du journal si
 * le repas y est (elles tiennent compte d'un écart rattrapé), sinon du plan.
 */
export async function loadMeal(userId: string): Promise<MealWidget | null> {
  return safe(async () => {
    const admin = createAdminClient();
    const today = todayInParis();
    const { hhmm } = nowInParis();
    const [plan, { data: logs }] = await Promise.all([
      getActivePlan(admin, userId),
      admin.from("food_logs").select("meal_slot, food_id, quantity_g, calories").eq("client_id", userId).eq("logged_at", today),
    ]);
    const rows = (logs ?? []) as { meal_slot: string; food_id: string; quantity_g: number; calories: number | null }[];
    const items = planItemsFor(plan, today);
    if (!items.length && !rows.length) return null;
    const slots = MEAL_SLOTS.map((s) => s.key).filter((k) => items.some((i) => i.slot === k) || rows.some((r) => r.meal_slot === k));
    const upcoming = slots.filter((k) => hhmm <= (SLOT_END[k] ?? "23:59"));
    const slot = upcoming[0];
    if (!slot) return { slot: "", label: "", until: "", foods: [], kcal: 0, left: 0 };
    const logged = rows.filter((r) => r.meal_slot === slot);
    let foods: { name: string; grams: number; kcal: number }[];
    if (logged.length) {
      const { data: names } = await admin.from("foods").select("id, name").in("id", [...new Set(logged.map((r) => r.food_id))]);
      const nameOf = new Map(((names ?? []) as { id: string; name: string }[]).map((f) => [f.id, f.name]));
      foods = logged.map((r) => ({ name: nameOf.get(r.food_id) ?? "Aliment", grams: Number(r.quantity_g), kcal: Number(r.calories ?? 0) }));
    } else {
      foods = items.filter((i) => i.slot === slot).map((i) => ({ name: i.food.name, grams: i.grams, kcal: (i.food.calories_per_100 * i.grams) / 100 }));
    }
    return {
      slot,
      label: slotLabel(slot),
      until: SLOT_END[slot] ?? "",
      foods: foods.map(({ name, grams }) => ({ name, grams: Math.round(grams) })),
      kcal: Math.round(foods.reduce((s, f) => s + f.kcal, 0)),
      left: upcoming.length,
    };
  });
}

// ── Séance ─────────────────────────────────────────────────────────────────

export interface WorkoutWidget {
  label: string;
  when: string; // "aujourd'hui 18:00", "demain 07:00", "lundi"
  isToday: boolean;
  exercises: { name: string; sets: number | null; reps: string | null }[];
}

const NOT_WORKOUT = new Set(["repas", "pas", "trajet", "travail", "pause", "rendezvous", "etude", "sommeil", "reveil"]);
const WORKOUT_RE = /(séance|seance|training|muscu|jambes|fessiers|push|pull|upper|lower|full|course|run|hyrox|crossfit|wod)/i;

export async function loadWorkout(userId: string, blocksP?: Promise<ScheduleBlock[]>): Promise<WorkoutWidget | null> {
  return safe(async () => {
    const [blocks, program] = await Promise.all([blocksP ?? getScheduleBlocks(userId), getActiveProgram(userId)]);
    const today = todayInParis();
    const { isoDow, hhmm } = nowInParis();
    const isW = (b: ScheduleBlock) => b.icon === "salle" || (!NOT_WORKOUT.has(b.icon ?? "") && WORKOUT_RE.test(b.label));
    for (let i = 0; i < 7; i++) {
      const date = shiftDate(today, i);
      const dow = ((isoDow - 1 + i) % 7) + 1;
      const b = blocks
        .filter((x) => isBlockOnDate(x, date, dow))
        .sort((a, c) => a.start_time.localeCompare(c.start_time))
        .find((x) => isW(x) && (i > 0 || x.end_time.slice(0, 5) > hhmm));
      if (b) {
        const label = b.label.replace(/^Séance\s*:\s*/i, "").trim();
        const day = program?.days.find((d) => d.day_label.trim().toLowerCase() === label.toLowerCase()) ?? null;
        const when = i === 0 ? `aujourd'hui ${b.start_time.slice(0, 5)}` : i === 1 ? `demain ${b.start_time.slice(0, 5)}` : new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long" });
        return { label, when, isToday: i === 0, exercises: (day?.exercises ?? []).slice(0, 5).map((e) => ({ name: e.name, sets: e.sets, reps: e.reps })) };
      }
    }
    // Pas d'agenda : séance du programme prévue ce jour de la semaine.
    const day = program?.days.find((d) => d.weekday === isoDow) ?? null;
    if (day) return { label: day.day_label, when: "aujourd'hui", isToday: true, exercises: day.exercises.slice(0, 5).map((e) => ({ name: e.name, sets: e.sets, reps: e.reps })) };
    if (program?.days.length) return { label: program.name, when: "", isToday: false, exercises: [] };
    return null;
  });
}

// ── Live ───────────────────────────────────────────────────────────────────

export interface LiveWidget { title: string; startsAt: string; isNow: boolean }

export async function loadLive(userId: string, role: "coach" | "client", coachId: string | null): Promise<LiveWidget | null> {
  return safe(async () => {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    let q = admin.from("live_events").select("title, starts_at, duration_minutes, status, invited_client_id, host_id").neq("status", "cancelled").gte("starts_at", since).order("starts_at").limit(10);
    if (role === "coach") q = q.eq("host_id", userId);
    else if (coachId) q = q.eq("host_id", coachId);
    else return null;
    const { data } = await q;
    const now = Date.now();
    const rows = ((data ?? []) as { title: string; starts_at: string; duration_minutes: number | null; status: string; invited_client_id: string | null }[])
      .filter((r) => role === "coach" || !r.invited_client_id || r.invited_client_id === userId)
      .filter((r) => new Date(r.starts_at).getTime() + (r.duration_minutes ?? 60) * 60000 > now);
    const r = rows[0];
    if (!r) return null;
    return { title: r.title, startsAt: r.starts_at, isNow: new Date(r.starts_at).getTime() <= now };
  });
}

// ── Stats réseaux ──────────────────────────────────────────────────────────

export interface StatsWidget {
  followers: number;
  delta7: number;
  series: number[]; // abonnés des 14 derniers jours (tous comptes)
  best: { caption: string; views: number; platform: string } | null;
  views7: number;
  /** Date des dernières données si la synchro a plus de 2 jours de retard. */
  staleSince: string | null;
}

export async function loadSocial(userId: string): Promise<StatsWidget | null> {
  return safe(async () => {
    const admin = createAdminClient();
    const { data: accounts } = await admin.from("social_accounts").select("id").eq("owner_id", userId).eq("active", true);
    const ids = ((accounts ?? []) as { id: string }[]).map((a) => a.id);
    if (!ids.length) return null;
    const today = todayInParis();
    const [{ data: daily }, { data: posts }] = await Promise.all([
      admin.from("social_account_daily").select("account_id, date, followers_total").in("account_id", ids).gte("date", shiftDate(today, -15)).order("date"),
      admin.from("social_posts").select("caption, views, platform, published_at").in("account_id", ids).gte("published_at", `${shiftDate(today, -7)}T00:00:00`).order("views", { ascending: false, nullsFirst: false }).limit(50),
    ]);
    const rows = (daily ?? []) as { account_id: string; date: string; followers_total: number | null }[];
    // Total par jour : dernière valeur connue de chaque compte (un compte sans
    // ligne un jour donné garde sa valeur de la veille, pas de faux creux).
    const dates = [...new Set(rows.map((r) => r.date))].sort();
    const last = new Map<string, number>();
    const series: number[] = [];
    for (const d of dates) {
      for (const r of rows.filter((x) => x.date === d && x.followers_total != null)) {
        const v = Number(r.followers_total);
        const prev = last.get(r.account_id);
        // Valeur aberrante de la synchro (ex. TikTok à 0 un jour puis 338 le
        // lendemain) : ignorée, on garde la dernière valeur fiable.
        if (prev != null && prev >= 20 && v < prev * 0.5) continue;
        last.set(r.account_id, v);
      }
      series.push([...last.values()].reduce((s, v) => s + v, 0));
    }
    const followers = series[series.length - 1] ?? 0;
    const weekAgoIdx = dates.findIndex((d) => d >= shiftDate(today, -7));
    const delta7 = weekAgoIdx >= 0 ? followers - series[weekAgoIdx] : 0;
    const p = (posts ?? []) as { caption: string | null; views: number | null; platform: string }[];
    const top = p[0];
    return {
      followers,
      delta7,
      series: series.slice(-14),
      best: top && Number(top.views) > 0 ? { caption: (top.caption ?? "").split("\n")[0].slice(0, 80) || "Sans légende", views: Number(top.views), platform: top.platform } : null,
      views7: p.reduce((s, x) => s + Number(x.views ?? 0), 0),
      staleSince: dates.length && dates[dates.length - 1] < shiftDate(today, -2) ? dates[dates.length - 1] : null,
    };
  });
}

const DEMO = "%@epcoaching.app";

// ── Bureau du coach : clients, leads, messages ─────────────────────────────

export interface DeskWidget {
  members: number;
  newMembers7: number;
  leads7: number;
  leadsTotal: number;
  unread: number;
  pendingBilans: number;
}

export async function loadDesk(userId: string, isOwner: boolean): Promise<DeskWidget | null> {
  return safe(async () => {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    // Le fondateur voit toute la plateforme (les membres gratuits n'ont pas
    // de coach attitré) ; un coach tiers, seulement les siens.
    // Les comptes de démonstration (@epcoaching.app) ne comptent jamais :
    // seulement de vraies personnes.
    const members = isOwner
      ? admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client").not("email", "ilike", DEMO)
      : admin.from("profiles").select("id", { count: "exact", head: true }).eq("coach_id", userId).neq("id", userId).not("email", "ilike", DEMO);
    const fresh = isOwner
      ? admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client").not("email", "ilike", DEMO).gte("created_at", since)
      : admin.from("profiles").select("id", { count: "exact", head: true }).eq("coach_id", userId).neq("id", userId).not("email", "ilike", DEMO).gte("created_at", since);
    const [m, n, leads, leadsAll, unread, mine] = await Promise.all([
      members,
      fresh,
      isOwner ? admin.from("leads").select("id", { count: "exact", head: true }).gte("created_at", since) : Promise.resolve({ count: 0 }),
      isOwner ? admin.from("leads").select("id", { count: "exact", head: true }) : Promise.resolve({ count: 0 }),
      admin.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", userId).eq("is_read", false),
      admin.from("profiles").select("id").eq("coach_id", userId).neq("id", userId).not("email", "ilike", DEMO),
    ]);
    const ids = ((mine.data ?? []) as { id: string }[]).map((r) => r.id);
    const { count: pending } = ids.length
      ? await admin.from("check_ins").select("id", { count: "exact", head: true }).is("coach_replied_at", null).in("client_id", ids)
      : { count: 0 };
    return { members: m.count ?? 0, newMembers7: n.count ?? 0, leads7: leads.count ?? 0, leadsTotal: leadsAll.count ?? 0, unread: unread.count ?? 0, pendingBilans: pending ?? 0 };
  });
}

// ── Contenu ────────────────────────────────────────────────────────────────

export interface ContentWidget { toFilm: number; filmed: number; newToday: number }

export async function loadContent(userId: string): Promise<ContentWidget | null> {
  return safe(async () => {
    const admin = createAdminClient();
    const today = todayInParis();
    const [a, b, c] = await Promise.all([
      admin.from("coach_scripts").select("id", { count: "exact", head: true }).eq("coach_id", userId).eq("status", "a_tourner"),
      admin.from("coach_scripts").select("id", { count: "exact", head: true }).eq("coach_id", userId).eq("status", "tourne"),
      admin.from("coach_scripts").select("id", { count: "exact", head: true }).eq("coach_id", userId).gte("created_at", `${today}T00:00:00`),
    ]);
    if (!a.count && !b.count) return null;
    return { toFilm: a.count ?? 0, filmed: b.count ?? 0, newToday: c.count ?? 0 };
  });
}

// ── Bilan du jour et tendance de poids ─────────────────────────────────────

export interface BodyWidget { doneToday: boolean; weight: number | null; trend7: number | null; sleep: number | null; steps: number | null }

export async function loadBody(userId: string): Promise<BodyWidget | null> {
  return safe(async () => {
    const admin = createAdminClient();
    const today = todayInParis();
    const { data } = await admin.from("daily_logs").select("log_date, weight_morning, sleep_hours, steps").eq("client_id", userId).gte("log_date", shiftDate(today, -14)).order("log_date");
    const rows = (data ?? []) as { log_date: string; weight_morning: number | null; sleep_hours: number | null; steps: number | null }[];
    const t = rows.find((r) => r.log_date === today);
    // Tendance = moyenne des 3 dernières pesées moins moyenne des 3 pesées
    // d'il y a une semaine : lisse l'eau et le sel d'un jour à l'autre.
    const w = rows.filter((r) => r.weight_morning != null);
    const avg = (xs: typeof w) => xs.reduce((s, r) => s + Number(r.weight_morning), 0) / xs.length;
    const recent = w.filter((r) => r.log_date > shiftDate(today, -4));
    const before = w.filter((r) => r.log_date <= shiftDate(today, -7) && r.log_date > shiftDate(today, -11));
    return {
      doneToday: !!t && (t.weight_morning != null || t.sleep_hours != null),
      weight: w.length ? Number(w[w.length - 1].weight_morning) : null,
      trend7: recent.length && before.length ? Math.round((avg(recent) - avg(before)) * 10) / 10 : null,
      sleep: t?.sleep_hours != null ? Number(t.sleep_hours) : null,
      steps: t?.steps != null ? Number(t.steps) : null,
    };
  });
}

// ── Courses ────────────────────────────────────────────────────────────────

export interface ShoppingWidget { low: string[]; total: number }

export async function loadShopping(userId: string): Promise<ShoppingWidget | null> {
  return safe(async () => {
    const { data } = await createAdminClient().from("pantry_items").select("name, quantity, low_threshold").eq("owner_id", userId);
    const rows = (data ?? []) as { name: string; quantity: number; low_threshold: number | null }[];
    if (!rows.length) return null;
    const low = rows.filter((r) => Number(r.quantity) <= 0 || (r.low_threshold != null && Number(r.quantity) <= Number(r.low_threshold))).map((r) => r.name);
    return { low, total: rows.length };
  });
}

// ── Prépa : photos et road map ─────────────────────────────────────────────

export interface PrepWidget { phase: string | null; phaseEnd: string | null; daysLeft: number | null; lastPhoto: string | null; photoDays: number | null }

export async function loadPrep(userId: string): Promise<PrepWidget | null> {
  return safe(async () => {
    const admin = createAdminClient();
    const today = todayInParis();
    const [{ data: maps }, { data: photo }] = await Promise.all([
      admin.from("roadmaps").select("id").eq("client_id", userId).order("updated_at", { ascending: false }).limit(1),
      admin.from("personal_photos").select("taken_at").eq("client_id", userId).order("taken_at", { ascending: false }).limit(1),
    ]);
    const mapId = (maps?.[0] as { id: string } | undefined)?.id;
    let phase: { label: string; end_date: string | null } | null = null;
    if (mapId) {
      const { data } = await admin.from("roadmap_phases").select("label, start_date, end_date").eq("roadmap_id", mapId).lte("start_date", today).order("start_date", { ascending: false }).limit(1);
      phase = (data?.[0] as { label: string; end_date: string | null } | undefined) ?? null;
    }
    const lastPhoto = (photo?.[0] as { taken_at: string } | undefined)?.taken_at ?? null;
    const photoDays = lastPhoto ? Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${lastPhoto.slice(0, 10)}T12:00:00Z`).getTime()) / 86400000) : null;
    if (!phase && !lastPhoto) return { phase: null, phaseEnd: null, daysLeft: null, lastPhoto: null, photoDays: null };
    return {
      phase: phase?.label ?? null,
      phaseEnd: phase?.end_date ?? null,
      daysLeft: phase?.end_date ? Math.round((new Date(`${phase.end_date}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86400000) : null,
      lastPhoto: lastPhoto ? lastPhoto.slice(0, 10) : null,
      photoDays,
    };
  });
}
