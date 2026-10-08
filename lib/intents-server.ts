// La réponse directement sur la tuile (2026-10-08) : « Quoi manger
// maintenant » affiche le prochain repas, « Ma séance » l'heure de la
// prochaine, « Ce que rapportent mes ads » le retour sur dépense... sans
// ouvrir la page. Chaque calcul est indépendant et silencieux en cas
// d'erreur : une tuile sans réponse reste une simple porte d'entrée.
import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis, nowInParis } from "@/lib/dates";
import { getActivePlan } from "@/lib/nutrition-sync";
import { MEAL_SLOTS, SLOT_END, planItemsFor, slotLabel } from "@/lib/nutrition-engine";
import type { Translator } from "@/lib/i18n";
import { getCoachAlertsCached } from "@/lib/coach-analytics";

type Admin = ReturnType<typeof createAdminClient>;


const fr = (n: number) => Math.round(n).toLocaleString("fr-FR");

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

type Block = { day_of_week: number; start_time: string; label: string; icon: string | null; notes: string | null; specific_date: string | null; skipped_dates: string[] | null };

function blocksFor(blocks: Block[], date: string, isoDow: number): Block[] {
  return blocks
    .filter((b) => (b.specific_date ? b.specific_date === date : b.day_of_week === isoDow && !(b.skipped_dates ?? []).includes(date)))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

// Un bloc typé (repas, pas, trajet, travail...) n'est jamais une séance,
// même si son nom contient « salle » (bug 2026-10-08 : « Steps : trajet
// vers la salle » sortait comme prochaine séance). Le nom ne compte que
// pour un bloc sans type.
const NOT_WORKOUT_ICONS = new Set(["repas", "pas", "trajet", "travail", "pause", "rendezvous", "etude", "sommeil", "reveil"]);
const isWorkout = (b: Block) =>
  b.icon === "salle" ||
  (!NOT_WORKOUT_ICONS.has(b.icon ?? "") && /(séance|seance|training|muscu|jambes|push|pull|upper|lower|course|run|hyrox|crossfit|wod)/i.test(b.label));

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Prochain repas = le prochain créneau du plan PAR L'HEURE, pas « le premier
// non noté » (2026-10-08, bug : la journée est pré-remplie avec le plan à
// l'ouverture, donc tout semblait « noté » dès le matin et la tuile disait
// « Tous les repas du jour sont notés » à 17 h, avant le pré-workout). Les
// quantités affichées sont celles du journal pour ce repas s'il existe
// (elles tiennent compte d'un écart rattrapé), sinon celles du plan.
async function nextMeal(admin: Admin, userId: string, today: string, hhmm: string, t: Translator): Promise<string | null> {
  const [plan, { data: logs }] = await Promise.all([
    getActivePlan(admin, userId),
    admin.from("food_logs").select("meal_slot, food_id, quantity_g, calories").eq("client_id", userId).eq("logged_at", today),
  ]);
  const rows = (logs ?? []) as { meal_slot: string; food_id: string; quantity_g: number; calories: number | null }[];
  const items = planItemsFor(plan, today);
  if (items.length) {
    const slots = MEAL_SLOTS.map((s) => s.key).filter((k) => items.some((i) => i.slot === k) || rows.some((r) => r.meal_slot === k));
    const slot = slots.find((k) => hhmm <= (SLOT_END[k] ?? "23:59"));
    if (!slot) return t("Plus de repas prévu aujourd'hui");
    const logged = rows.filter((r) => r.meal_slot === slot);
    let foods: string[];
    if (logged.length) {
      const { data: names } = await admin.from("foods").select("id, name").in("id", [...new Set(logged.map((r) => r.food_id))]);
      const nameOf = new Map(((names ?? []) as { id: string; name: string }[]).map((f) => [f.id, f.name]));
      foods = logged.slice(0, 3).map((r) => `${nameOf.get(r.food_id) ?? t("Aliment")} ${fr(Number(r.quantity_g))} g`);
    } else {
      foods = items.filter((i) => i.slot === slot).slice(0, 3).map((i) => `${i.food.name} ${fr(i.grams)} g`);
    }
    return `${t(slotLabel(slot))} : ${foods.join(", ")}`;
  }
  const eaten = rows.reduce((s, l) => s + Number(l.calories ?? 0), 0);
  const { data: target } = await admin.from("nutrition_profiles").select("calories_target").eq("client_id", userId).order("updated_at", { ascending: false }).limit(1);
  const goal = Number((target?.[0] as { calories_target?: number } | undefined)?.calories_target ?? 0);
  if (goal > 0) return t("Il te reste environ {n} kcal aujourd'hui", { n: fr(Math.max(0, goal - eaten)) });
  return null;
}

async function nextWorkout(admin: Admin, userId: string, today: string, isoDow: number, hhmm: string, t: Translator): Promise<string | null> {
  const { data } = await admin.from("schedule_blocks").select("day_of_week, start_time, label, icon, notes, specific_date, skipped_dates").eq("owner_id", userId);
  const blocks = (data ?? []) as Block[];
  for (let i = 0; i < 7; i++) {
    const date = shiftDate(today, i);
    const dow = ((isoDow - 1 + i) % 7) + 1;
    const found = blocksFor(blocks, date, dow).find((b) => isWorkout(b) && (i > 0 || b.start_time.slice(0, 5) >= hhmm));
    if (found) {
      const when = i === 0 ? t("aujourd'hui") : i === 1 ? t("demain") : new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long" });
      return `${found.label || t("Séance")} : ${when} ${found.start_time.slice(0, 5)}`;
    }
  }
  return t("Ouvre ton programme du jour");
}

async function nextBlock(admin: Admin, userId: string, today: string, isoDow: number, hhmm: string, t: Translator): Promise<string | null> {
  const { data } = await admin.from("schedule_blocks").select("day_of_week, start_time, label, icon, notes, specific_date, skipped_dates").eq("owner_id", userId);
  const next = blocksFor((data ?? []) as Block[], today, isoDow).find((b) => b.start_time.slice(0, 5) >= hhmm);
  return next ? t("Ensuite : {label} à {time}", { label: next.label || t("Créneau"), time: next.start_time.slice(0, 5) }) : t("Plus rien de prévu aujourd'hui");
}

/** Réponses courtes à afficher sous chaque tuile, par identifiant d'intention. */
export async function getIntentHints(userId: string, space: "coach" | "client", ids: string[], t: Translator): Promise<Record<string, string>> {
  const admin = createAdminClient();
  const today = todayInParis();
  const { isoDow, hhmm } = nowInParis();
  const want = new Set(ids);
  const jobs: [string, Promise<string | null>][] = [];
  const add = (id: string, fn: () => Promise<string | null>) => {
    if (want.has(id)) jobs.push([id, safe(fn).then((v) => v ?? null)]);
  };

  add("manger", () => nextMeal(admin, userId, today, hhmm, t));
  add("seance", () => nextWorkout(admin, userId, today, isoDow, hhmm, t));
  add("agenda", () => nextBlock(admin, userId, today, isoDow, hhmm, t));
  add("bilan", async () => {
    const { data } = await admin.from("daily_logs").select("weight_morning, sleep_hours").eq("client_id", userId).eq("log_date", today).maybeSingle();
    return data && (data.weight_morning != null || data.sleep_hours != null) ? t("Fait aujourd'hui ✓") : t("À faire, 30 secondes");
  });
  add("pas", async () => {
    const { data } = await admin.from("daily_logs").select("steps").eq("client_id", userId).eq("log_date", today).maybeSingle();
    return data?.steps ? t("{n} pas aujourd'hui", { n: fr(Number(data.steps)) }) : null;
  });
  add("courses", async () => {
    const { data } = await admin.from("pantry_items").select("quantity, low_threshold").eq("owner_id", userId);
    const rows = (data ?? []) as { quantity: number; low_threshold: number | null }[];
    const low = rows.filter((r) => Number(r.quantity) <= 0 || (r.low_threshold != null && Number(r.quantity) <= Number(r.low_threshold))).length;
    return rows.length ? (low ? t("{n} article(s) à racheter", { n: low }) : t("Stock à jour")) : null;
  });
  add("records", async () => {
    const { count } = await admin.from("performance_entries").select("id", { count: "exact", head: true }).eq("owner_id", userId).gte("performed_on", shiftDate(today, -30));
    return count ? t("{n} saisie(s) ce mois", { n: count }) : null;
  });

  if (space === "client") {
    add("message_coach", async () => {
      const { count } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", userId).eq("is_read", false);
      return count ? t("{n} message(s) non lu(s)", { n: count }) : t("Réponse de ton coach ici");
    });
  }

  if (space === "coach") {
    add("clients_attention", async () => {
      const alerts = await getCoachAlertsCached(userId);
      if (alerts.length) return t("{n} client(s) à voir", { n: alerts.length });
      const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("coach_id", userId).eq("role", "client").neq("id", userId);
      return count ? t("Tout le monde est suivi ✓") : t("Aucun client pour l'instant");
    });
    add("message", async () => {
      const { count } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", userId).eq("is_read", false);
      return count ? t("{n} message(s) non lu(s)", { n: count }) : t("Aucun message en attente");
    });
    add("ecrire", async () => {
      const { count } = await admin.from("coach_scripts").select("id", { count: "exact", head: true }).eq("coach_id", userId).gte("created_at", `${today}T00:00:00`);
      return count ? t("{n} nouveau(x) script(s) aujourd'hui", { n: count }) : t("Une idée, Claude t'aide à l'écrire");
    });
    add("bilans_repondre", async () => {
      const { data: clients } = await admin.from("profiles").select("id").eq("coach_id", userId).eq("role", "client").neq("id", userId);
      const ids2 = ((clients ?? []) as { id: string }[]).map((c) => c.id);
      if (!ids2.length) return null;
      const { count } = await admin.from("check_ins").select("id", { count: "exact", head: true }).is("coach_replied_at", null).in("client_id", ids2);
      return count ? t("{n} à traiter", { n: count }) : t("Rien en attente ✓");
    });
    add("ads", async () => {
      const { data } = await admin.from("ad_campaigns").select("spend_total, revenue_generated, leads").eq("coach_id", userId);
      const rows = (data ?? []) as { spend_total: number | null; revenue_generated: number | null; leads: number | null }[];
      if (!rows.length) return t("Aucune campagne suivie");
      const spend = rows.reduce((s, r) => s + Number(r.spend_total ?? 0), 0);
      const rev = rows.reduce((s, r) => s + Number(r.revenue_generated ?? 0), 0);
      if (!spend) return null;
      return rev ? t("{rev} € rapportés pour {spend} € (x{roas})", { rev: fr(rev), spend: fr(spend), roas: (rev / spend).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) }) : t("{spend} € dépensés, revenu à renseigner", { spend: fr(spend) });
    });
    add("stats_organiques", async () => {
      const { data: accounts } = await admin.from("social_accounts").select("id").eq("owner_id", userId).eq("active", true);
      const ids2 = ((accounts ?? []) as { id: string }[]).map((a) => a.id);
      if (!ids2.length) return null;
      const { data } = await admin.from("social_account_daily").select("account_id, date, followers_total").in("account_id", ids2).gte("date", shiftDate(today, -8)).order("date");
      const rows = (data ?? []) as { account_id: string; followers_total: number | null }[];
      let delta = 0;
      let total = 0;
      for (const id of ids2) {
        const s = rows.filter((r) => r.account_id === id && r.followers_total != null);
        if (s.length) {
          total += Number(s[s.length - 1].followers_total);
          delta += Number(s[s.length - 1].followers_total) - Number(s[0].followers_total);
        }
      }
      return total ? t("{total} abonnés, {delta} en 7 jours", { total: fr(total), delta: `${delta >= 0 ? "+" : ""}${fr(delta)}` }) : null;
    });
    add("tournage", async () => {
      const { count } = await admin.from("coach_scripts").select("id", { count: "exact", head: true }).eq("coach_id", userId).eq("status", "a_tourner");
      return count ? t("{n} script(s) prêt(s) à tourner", { n: count }) : t("Aucun script à tourner");
    });
    add("taches_equipe", async () => {
      const { data: staff } = await admin.from("staff_members").select("user_id").eq("owner_id", userId).eq("status", "actif");
      const ids2 = ((staff ?? []) as { user_id: string }[]).map((s) => s.user_id);
      if (!ids2.length) return t("Pas encore d'équipe");
      const { count } = await admin.from("staff_records").select("id", { count: "exact", head: true }).eq("kind", "task").neq("status", "fait").in("staff_id", ids2);
      return t("{n} tâche(s) en cours", { n: count ?? 0 });
    });
  }

  const out: Record<string, string> = {};
  for (const [id, p] of jobs) {
    const v = await p;
    if (v) out[id] = v;
  }
  return out;
}
