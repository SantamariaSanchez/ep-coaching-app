// Outils supplémentaires du connecteur Claude (2026-10-07) : ce qu'un coach,
// un client ou un membre peut faire en parlant à Claude, sans clé d'API ni
// code. Chaque outil n'agit que sur les données du propriétaire de la clé
// (et, pour un coach, sur ses propres clients).
import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";
import { fuzzyScore } from "@/lib/fuzzy-search";
import { syncDailyNutrition } from "@/lib/nutrition-sync";
import { MEAL_SLOTS } from "@/lib/nutrition-engine";
import { DISCIPLINE_BY_KEY, bestRecords, type PerformanceEntry } from "@/lib/disciplines";
import { cleanPositioning, positioningMarkdown, POSITIONING_KEYS, type Positioning } from "@/lib/positioning";

type Role = "coach" | "client" | "staff";
type ToolDef = { name: string; description: string; inputSchema: Record<string, unknown>; roles: Role[] };

const ALL: Role[] = ["coach", "client", "staff"];

export const EXTRA_TOOLS: ToolDef[] = [
  {
    name: "ma_journee",
    roles: ALL,
    description: "Résumé d'une journée dans EP Coaching : bilan (poids, sommeil, pas, énergie), repas notés avec calories et macros, séance faite. Par défaut aujourd'hui.",
    inputSchema: { type: "object", properties: { date: { type: "string", description: "AAAA-MM-JJ, aujourd'hui par défaut" } } },
  },
  {
    name: "noter_ma_journee",
    roles: ALL,
    description: "Enregistre des valeurs du bilan du jour dans EP Coaching (seulement celles données) : poids du matin en kg, heures de sommeil, pas, énergie, moral et courbatures de 1 à 5, litres d'eau.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "AAAA-MM-JJ, aujourd'hui par défaut (7 jours en arrière maximum)" },
        poids_kg: { type: "number" },
        sommeil_heures: { type: "number" },
        pas: { type: "number" },
        energie: { type: "number", description: "1 à 5" },
        moral: { type: "number", description: "1 à 5" },
        courbatures: { type: "number", description: "1 à 5" },
        eau_litres: { type: "number" },
      },
    },
  },
  {
    name: "ajouter_repas",
    roles: ALL,
    description: "Ajoute des aliments au journal nutrition EP Coaching. Chaque aliment est cherché dans la base EP Coaching par son nom (tolérant aux fautes) ; les calories et macros sont calculées par l'appli. Utile après avoir analysé une photo d'assiette.",
    inputSchema: {
      type: "object",
      properties: {
        aliments: {
          type: "array",
          items: { type: "object", properties: { nom: { type: "string" }, grammes: { type: "number" } }, required: ["nom", "grammes"] },
        },
        repas: { type: "string", enum: MEAL_SLOTS.map((s) => s.key), description: "breakfast, morning, lunch, afternoon, preworkout, postworkout ou dinner" },
        date: { type: "string", description: "AAAA-MM-JJ, aujourd'hui par défaut" },
      },
      required: ["aliments", "repas"],
    },
  },
  {
    name: "mes_records",
    roles: ALL,
    description: "Records et dernières performances dans EP Coaching (course, Hyrox, CrossFit, force, rééducation, suivi santé) et les meilleures charges en musculation.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "mes_clients",
    roles: ["coach"],
    description: "Liste des clients du coach avec leur dernier bilan hebdo, s'il attend une réponse, leur dernier bilan du jour et leur poids récent. Sert à savoir qui a besoin d'attention.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "fiche_client",
    roles: ["coach"],
    description: "Fiche d'un client du coach (recherche par nom, tolérante aux fautes) : programme, 4 derniers bilans hebdo avec ses réponses, tendance de poids, séances récentes.",
    inputSchema: { type: "object", properties: { nom: { type: "string" } }, required: ["nom"] },
  },
  {
    name: "mes_stats_reseaux",
    roles: ["coach"],
    description: "Stats réseaux du coach dans EP Coaching : abonnés par plateforme et progression, meilleures et pires publications de la période avec le script du Studio associé, meilleur format.",
    inputSchema: { type: "object", properties: { jours: { type: "number", description: "7 à 365, 30 par défaut" } } },
  },
  {
    name: "mes_scripts",
    roles: ["coach"],
    description: "Scripts du Studio créatif du coach (titre, accroche, statut).",
    inputSchema: { type: "object", properties: { statut: { type: "string", enum: ["a_tourner", "tourne", "publie"] }, nombre: { type: "number" } } },
  },
  {
    name: "ajouter_script",
    roles: ["coach"],
    description: "Ajoute un script dans le Studio créatif du coach, statut « à tourner ».",
    inputSchema: {
      type: "object",
      properties: {
        titre: { type: "string" },
        accroche: { type: "string", description: "La première phrase dite face caméra" },
        contenu: { type: "string", description: "Le script complet" },
        cta: { type: "string", description: "L'appel à l'action de fin" },
        plateforme: { type: "string", enum: ["instagram", "tiktok", "youtube", "facebook", "linkedin", "threads"] },
        pilier: { type: "string" },
      },
      required: ["titre", "contenu"],
    },
  },
  {
    name: "ajouter_idee_contenu",
    roles: ["coach"],
    description: "Ajoute une idée de contenu dans le Studio du coach.",
    inputSchema: {
      type: "object",
      properties: { titre: { type: "string" }, notes: { type: "string" }, plateforme: { type: "string", enum: ["instagram", "tiktok", "youtube", "facebook", "linkedin", "threads", "general"] } },
      required: ["titre"],
    },
  },
  {
    name: "mon_positionnement",
    roles: ["coach"],
    description: "Positionnement du coach rempli dans EP Coaching : niche, résultat promis, avatar client (douleurs, désirs, objections, ses mots), offre, différence, piliers de contenu. À lire avant d'écrire un script, une bio ou une page de vente.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "enregistrer_positionnement",
    roles: ["coach"],
    description: "Met à jour le positionnement du coach dans EP Coaching. Seuls les champs donnés sont modifiés. Champs : " + POSITIONING_KEYS.join(", ") + ".",
    inputSchema: { type: "object", properties: Object.fromEntries(POSITIONING_KEYS.map((k) => [k, { type: "string" }])) },
  },
];

const text = (t: string) => ({ content: [{ type: "text", text: t }] });
const fr = (n: number, d = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const shift = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const numArg = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export function toolsForRole(role: Role) {
  return EXTRA_TOOLS.filter((t) => t.roles.includes(role)).map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
}

export async function callExtraTool(ownerId: string, role: Role, name: string, args: Record<string, unknown>) {
  const tool = EXTRA_TOOLS.find((t) => t.name === name);
  if (!tool) return null;
  if (!tool.roles.includes(role)) return text("Cet outil est réservé aux coachs.");
  const admin = createAdminClient();
  const today = todayInParis();

  switch (name) {
    case "ma_journee": {
      const date = isDate(args.date) ? args.date : today;
      const [{ data: log }, { data: foods }, { data: sessions }] = await Promise.all([
        admin.from("daily_logs").select("weight_morning, sleep_hours, steps, energy, mood, soreness, water_l, training_name").eq("client_id", ownerId).eq("log_date", date).maybeSingle(),
        admin.from("food_logs").select("meal_slot, quantity_g, calories, proteins, carbs, fats, foods(name)").eq("client_id", ownerId).eq("logged_at", date),
        admin.from("sessions").select("day_label, is_completed, duration_minutes").eq("client_id", ownerId).eq("session_date", date),
      ]);
      const lines: string[] = [`Journée du ${date}`];
      if (log) {
        const l = log as Record<string, number | string | null>;
        const parts = [
          l.weight_morning != null && `poids ${fr(Number(l.weight_morning), 1)} kg`,
          l.sleep_hours != null && `sommeil ${fr(Number(l.sleep_hours), 1)} h`,
          l.steps != null && `${fr(Number(l.steps))} pas`,
          l.energy != null && `énergie ${l.energy}/5`,
          l.mood != null && `moral ${l.mood}/5`,
          l.soreness != null && `courbatures ${l.soreness}/5`,
          l.water_l != null && `${fr(Number(l.water_l), 1)} L d'eau`,
        ].filter(Boolean);
        lines.push(`Bilan : ${parts.length ? parts.join(", ") : "rien de noté"}`);
      } else lines.push("Bilan : rien de noté");
      const rows = (foods ?? []) as unknown as { meal_slot: string; quantity_g: number; calories: number; proteins: number; carbs: number; fats: number; foods: { name: string } | null }[];
      if (rows.length) {
        const tot = rows.reduce((a, r) => ({ k: a.k + Number(r.calories || 0), p: a.p + Number(r.proteins || 0), g: a.g + Number(r.carbs || 0), l: a.l + Number(r.fats || 0) }), { k: 0, p: 0, g: 0, l: 0 });
        lines.push(`Nutrition : ${fr(tot.k)} kcal, ${fr(tot.p)} g protéines, ${fr(tot.g)} g glucides, ${fr(tot.l)} g lipides`);
        for (const s of MEAL_SLOTS) {
          const items = rows.filter((r) => r.meal_slot === s.key);
          if (items.length) lines.push(`- ${s.label} : ${items.map((i) => `${i.foods?.name ?? "aliment"} ${fr(Number(i.quantity_g))} g`).join(", ")}`);
        }
      } else lines.push("Nutrition : aucun repas noté");
      const ss = (sessions ?? []) as { day_label: string | null; is_completed: boolean; duration_minutes: number | null }[];
      lines.push(ss.length ? `Séance : ${ss.map((s) => `${s.day_label ?? "séance"}${s.is_completed ? " (terminée)" : " (en cours)"}`).join(", ")}` : "Séance : aucune");
      return text(lines.join("\n"));
    }

    case "noter_ma_journee": {
      const date = isDate(args.date) ? args.date : today;
      if (date > today || date < shift(today, -7)) return text("Date hors limites : aujourd'hui ou les 7 derniers jours seulement.");
      const patch: Record<string, number> = {};
      const w = numArg(args.poids_kg, 25, 400); if (w !== null) patch.weight_morning = Math.round(w * 10) / 10;
      const s = numArg(args.sommeil_heures, 0, 24); if (s !== null) patch.sleep_hours = Math.round(s * 4) / 4;
      const st = numArg(args.pas, 0, 200000); if (st !== null) patch.steps = Math.round(st);
      const e = numArg(args.energie, 1, 5); if (e !== null) patch.energy = Math.round(e);
      const m = numArg(args.moral, 1, 5); if (m !== null) patch.mood = Math.round(m);
      const c = numArg(args.courbatures, 1, 5); if (c !== null) patch.soreness = Math.round(c);
      const wa = numArg(args.eau_litres, 0, 15); if (wa !== null) patch.water_l = Math.round(wa * 10) / 10;
      if (!Object.keys(patch).length) return text("Aucune valeur valide à enregistrer.");
      const { error } = await admin.from("daily_logs").upsert({ client_id: ownerId, log_date: date, ...patch, updated_at: new Date().toISOString() }, { onConflict: "client_id,log_date" });
      if (error) return text("Enregistrement impossible, réessaie.");
      return text(`Bilan du ${date} mis à jour dans EP Coaching : ${Object.keys(patch).length} valeur(s).`);
    }

    case "ajouter_repas": {
      const date = isDate(args.date) ? args.date : today;
      if (date > today || date < shift(today, -30)) return text("Date hors limites : aujourd'hui ou les 30 derniers jours seulement.");
      const slot = MEAL_SLOTS.some((s) => s.key === args.repas) ? String(args.repas) : null;
      if (!slot) return text("Repas inconnu : breakfast, morning, lunch, afternoon, preworkout, postworkout ou dinner.");
      const items = (Array.isArray(args.aliments) ? args.aliments : []).slice(0, 15) as { nom?: unknown; grammes?: unknown }[];
      const done: string[] = [];
      const missing: string[] = [];
      const rows: Record<string, unknown>[] = [];
      for (const it of items) {
        const nom = typeof it.nom === "string" ? it.nom.trim().slice(0, 80) : "";
        const g = numArg(it.grammes, 1, 3000);
        if (!nom || g === null) continue;
        // Préfiltre large (3 premières lettres du mot principal) puis
        // classement tolérant aux fautes : « bannane » retrouve « Banane ».
        const first = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).sort((a, b) => b.length - a.length)[0].slice(0, 3);
        const { data: cands } = await admin
          .from("foods")
          .select("id, name, calories_per_100, proteins_per_100, carbs_per_100, fats_per_100, is_custom, created_by")
          .ilike("name", `%${first}%`)
          .limit(400);
        const pool = ((cands ?? []) as { id: string; name: string; calories_per_100: number; proteins_per_100: number; carbs_per_100: number; fats_per_100: number; is_custom: boolean | null; created_by: string | null }[])
          .filter((f) => !f.is_custom || f.created_by === ownerId);
        const best = pool.map((f) => ({ f, s: fuzzyScore(f.name, nom) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s || a.f.name.length - b.f.name.length)[0]?.f;
        if (!best) {
          missing.push(nom);
          continue;
        }
        const r = g / 100;
        rows.push({
          client_id: ownerId, food_id: best.id, meal_slot: slot, quantity_g: g, logged_at: date,
          calories: Math.round(best.calories_per_100 * r),
          proteins: Math.round(best.proteins_per_100 * r * 10) / 10,
          carbs: Math.round(best.carbs_per_100 * r * 10) / 10,
          fats: Math.round(best.fats_per_100 * r * 10) / 10,
        });
        done.push(`${best.name} ${fr(g)} g`);
      }
      if (rows.length) {
        const { error } = await admin.from("food_logs").insert(rows);
        if (error) return text("Ajout impossible, réessaie.");
        await syncDailyNutrition(admin, ownerId, date).catch(() => undefined);
      }
      const out = [rows.length ? `Ajouté au journal du ${date} : ${done.join(", ")}.` : "Rien d'ajouté."];
      if (missing.length) out.push(`Introuvable dans la base EP Coaching : ${missing.join(", ")}. Essaie un nom plus simple (ex. « riz basmati cuit »).`);
      return text(out.join("\n"));
    }

    case "mes_records": {
      const [{ data: perf }, { data: lifts }] = await Promise.all([
        admin.from("performance_entries").select("id, discipline, kind, performed_on, data").eq("owner_id", ownerId).order("performed_on", { ascending: false }).limit(500),
        admin.from("workout_logs").select("exercise_name, weight_kg, reps, logged_at").eq("client_id", ownerId).gt("weight_kg", 0).order("weight_kg", { ascending: false }).limit(400),
      ]);
      const lines: string[] = [];
      const entries = (perf ?? []) as PerformanceEntry[];
      for (const key of [...new Set(entries.map((e) => e.discipline))]) {
        const d = DISCIPLINE_BY_KEY[key as keyof typeof DISCIPLINE_BY_KEY];
        if (!d) continue;
        const mine = entries.filter((e) => e.discipline === key);
        const recs = bestRecords(d, mine);
        lines.push(`${d.label} : ${mine.length} saisie(s)${recs.length ? `, records : ${recs.map((r) => `${r.label} ${r.display} (${r.date})`).join(", ")}` : ""}`);
      }
      const best = new Map<string, { w: number; reps: string; date: string }>();
      for (const l of (lifts ?? []) as { exercise_name: string; weight_kg: number; reps: string; logged_at: string }[]) {
        if (!best.has(l.exercise_name)) best.set(l.exercise_name, { w: Number(l.weight_kg), reps: l.reps, date: l.logged_at });
      }
      if (best.size) lines.push(`Musculation, meilleures charges : ${[...best.entries()].slice(0, 15).map(([n, b]) => `${n} ${fr(b.w, 1)} kg × ${b.reps} (${b.date})`).join(", ")}`);
      return text(lines.length ? lines.join("\n") : "Aucune performance enregistrée pour l'instant.");
    }

    case "mes_clients": {
      const { data: clients } = await admin.from("profiles").select("id, full_name, subscription_status").eq("coach_id", ownerId).eq("role", "client").neq("id", ownerId).limit(200);
      const list = (clients ?? []) as { id: string; full_name: string | null; subscription_status: string | null }[];
      if (!list.length) return text("Aucun client rattaché pour l'instant.");
      const ids = list.map((c) => c.id);
      const [{ data: checks }, { data: logs }] = await Promise.all([
        admin.from("check_ins").select("client_id, week_start, coach_replied_at, weight_avg, general_feeling").in("client_id", ids).gte("week_start", shift(today, -35)).order("week_start", { ascending: false }),
        admin.from("daily_logs").select("client_id, log_date, weight_morning").in("client_id", ids).gte("log_date", shift(today, -14)).order("log_date", { ascending: false }),
      ]);
      const lastCheck = new Map<string, { week_start: string; coach_replied_at: string | null; weight_avg: number | null }>();
      for (const c of (checks ?? []) as { client_id: string; week_start: string; coach_replied_at: string | null; weight_avg: number | null }[]) if (!lastCheck.has(c.client_id)) lastCheck.set(c.client_id, c);
      const lastLog = new Map<string, { log_date: string; weight_morning: number | null }>();
      for (const l of (logs ?? []) as { client_id: string; log_date: string; weight_morning: number | null }[]) if (!lastLog.has(l.client_id)) lastLog.set(l.client_id, l);
      const lines = list.map((c) => {
        const ck = lastCheck.get(c.id);
        const lg = lastLog.get(c.id);
        const parts = [
          c.subscription_status === "active" ? "payant" : "non payant",
          ck ? `bilan hebdo du ${ck.week_start}${ck.coach_replied_at ? "" : " EN ATTENTE DE TA RÉPONSE"}` : "aucun bilan hebdo depuis 5 semaines",
          lg ? `dernier bilan du jour ${lg.log_date}${lg.weight_morning ? ` (${fr(Number(lg.weight_morning), 1)} kg)` : ""}` : "aucun bilan du jour depuis 14 jours",
        ];
        return `- ${c.full_name ?? "Sans nom"} : ${parts.join(", ")}`;
      });
      return text(`${list.length} client(s)\n${lines.join("\n")}`);
    }

    case "fiche_client": {
      const nom = String(args.nom ?? "").trim();
      const { data: clients } = await admin.from("profiles").select("id, full_name, email").eq("coach_id", ownerId).eq("role", "client").neq("id", ownerId).limit(300);
      const list = (clients ?? []) as { id: string; full_name: string | null; email: string | null }[];
      const found = list.map((c) => ({ c, s: Math.max(fuzzyScore(c.full_name ?? "", nom), fuzzyScore(c.email ?? "", nom)) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s)[0]?.c;
      if (!found) return text(`Aucun de tes clients ne correspond à « ${nom} ».`);
      const [{ data: prog }, { data: checks }, { data: logs }, { data: sess }] = await Promise.all([
        admin.from("programs").select("name, objective, frequency").eq("client_id", found.id).eq("is_active", true).maybeSingle(),
        admin.from("check_ins").select("week_start, weight_avg, nutrition_adherence, sleep_hours, general_feeling, biggest_win, upcoming_obstacles, coach_questions, client_notes, coach_replied_at").eq("client_id", found.id).order("week_start", { ascending: false }).limit(4),
        admin.from("daily_logs").select("log_date, weight_morning").eq("client_id", found.id).gte("log_date", shift(today, -28)).not("weight_morning", "is", null).order("log_date"),
        admin.from("sessions").select("session_date, day_label").eq("client_id", found.id).eq("is_completed", true).gte("session_date", shift(today, -14)).order("session_date", { ascending: false }),
      ]);
      const lines = [`Client : ${found.full_name ?? found.email}`];
      if (prog) lines.push(`Programme actif : ${prog.name}${prog.objective ? `, objectif ${prog.objective}` : ""}${prog.frequency ? `, ${prog.frequency} séances/sem` : ""}`);
      const w = (logs ?? []) as { log_date: string; weight_morning: number }[];
      if (w.length >= 2) lines.push(`Poids sur 4 semaines : ${fr(Number(w[0].weight_morning), 1)} kg (${w[0].log_date}) puis ${fr(Number(w[w.length - 1].weight_morning), 1)} kg (${w[w.length - 1].log_date})`);
      lines.push(`Séances terminées sur 14 jours : ${(sess ?? []).length}`);
      for (const c of (checks ?? []) as Record<string, string | number | null>[]) {
        const bits = [
          c.weight_avg != null && `poids moyen ${fr(Number(c.weight_avg), 1)} kg`,
          c.nutrition_adherence != null && `adhérence nutrition ${c.nutrition_adherence}`,
          c.sleep_hours != null && `sommeil ${c.sleep_hours} h`,
          c.general_feeling != null && `ressenti ${c.general_feeling}`,
          c.biggest_win && `victoire : ${c.biggest_win}`,
          c.upcoming_obstacles && `obstacles : ${c.upcoming_obstacles}`,
          c.coach_questions && `questions : ${c.coach_questions}`,
          c.client_notes && `notes : ${c.client_notes}`,
        ].filter(Boolean);
        lines.push(`Bilan semaine du ${c.week_start}${c.coach_replied_at ? "" : " (pas encore répondu)"} : ${bits.join(" ; ") || "vide"}`);
      }
      return text(lines.join("\n"));
    }

    case "mes_stats_reseaux": {
      const days = numArg(args.jours, 7, 365) ?? 30;
      const since = shift(today, -days);
      const { data: accounts } = await admin.from("social_accounts").select("id, platform, name, handle").eq("owner_id", ownerId).eq("active", true);
      const accs = (accounts ?? []) as { id: string; platform: string; name: string | null; handle: string | null }[];
      if (!accs.length) return text("Aucun réseau suivi pour l'instant. Ajoute tes comptes dans EP Coaching, Business > Mes stats réseaux.");
      const ids = accs.map((a) => a.id);
      const [{ data: snaps }, { data: posts }] = await Promise.all([
        admin.from("social_account_daily").select("account_id, date, followers_total").in("account_id", ids).gte("date", shift(since, -1)).order("date"),
        admin.from("social_posts").select("account_id, platform, caption, post_type, published_at, views, impressions, likes, comments, shares, saves, script_id, url").in("account_id", ids).gte("published_at", since).limit(1000),
      ]);
      const lines: string[] = [`Stats réseaux sur ${days} jours`];
      for (const a of accs) {
        const s = ((snaps ?? []) as { account_id: string; date: string; followers_total: number | null }[]).filter((x) => x.account_id === a.id && x.followers_total != null);
        if (s.length) {
          const first = Number(s[0].followers_total), last = Number(s[s.length - 1].followers_total);
          lines.push(`- ${a.platform} ${a.handle ?? a.name ?? ""} : ${fr(last)} abonnés (${last - first >= 0 ? "+" : ""}${fr(last - first)})`);
        } else lines.push(`- ${a.platform} ${a.handle ?? a.name ?? ""} : abonnés non renseignés`);
      }
      const rows = ((posts ?? []) as { platform: string; caption: string | null; post_type: string | null; published_at: string; views: number | null; impressions: number | null; likes: number | null; comments: number | null; shares: number | null; saves: number | null; script_id: string | null; url: string | null }[])
        .map((p) => ({ ...p, score: Number(p.views ?? p.impressions ?? 0) }));
      if (rows.length) {
        const scriptIds = [...new Set(rows.map((r) => r.script_id).filter(Boolean))] as string[];
        const { data: scripts } = scriptIds.length ? await admin.from("coach_scripts").select("id, title, hook").in("id", scriptIds) : { data: [] };
        const sMap = new Map(((scripts ?? []) as { id: string; title: string; hook: string | null }[]).map((s) => [s.id, s]));
        const fmt = (p: (typeof rows)[number]) => {
          const sc = p.script_id ? sMap.get(p.script_id) : null;
          return `${p.platform} ${p.post_type ?? ""} ${p.published_at.slice(0, 10)} : ${fr(p.score)} vues, ${fr(Number(p.likes ?? 0))} j'aime, ${fr(Number(p.comments ?? 0))} com., ${fr(Number(p.shares ?? 0))} partages${sc ? ` | script « ${sc.title} »${sc.hook ? `, accroche « ${sc.hook} »` : ""}` : ""} | ${(p.caption ?? "").replace(/\s+/g, " ").slice(0, 120)}`;
        };
        const sorted = [...rows].sort((a, b) => b.score - a.score);
        lines.push(`${rows.length} publications. Moyenne ${fr(rows.reduce((a, r) => a + r.score, 0) / rows.length)} vues.`);
        lines.push("Top 5 :", ...sorted.slice(0, 5).map((p) => `- ${fmt(p)}`));
        if (sorted.length > 5) lines.push("Flop 5 :", ...sorted.slice(-5).map((p) => `- ${fmt(p)}`));
        const byType = new Map<string, number[]>();
        for (const r of rows) byType.set(r.post_type ?? "autre", [...(byType.get(r.post_type ?? "autre") ?? []), r.score]);
        lines.push(`Vues moyennes par format : ${[...byType.entries()].filter(([, v]) => v.length >= 2).map(([k, v]) => `${k} ${fr(v.reduce((a, b) => a + b, 0) / v.length)} (${v.length})`).join(", ") || "pas assez de données"}`);
      } else lines.push("Aucune publication sur la période.");
      return text(lines.join("\n"));
    }

    case "mes_scripts": {
      const limit = numArg(args.nombre, 1, 50) ?? 20;
      let q = admin.from("coach_scripts").select("title, hook, status, platform, pillar, updated_at").eq("coach_id", ownerId).order("updated_at", { ascending: false }).limit(limit);
      if (typeof args.statut === "string" && ["a_tourner", "tourne", "publie"].includes(args.statut)) q = q.eq("status", args.statut);
      const { data } = await q;
      const rows = (data ?? []) as { title: string; hook: string | null; status: string; platform: string | null; pillar: string | null }[];
      return text(rows.length ? rows.map((r) => `- [${r.status}] ${r.title}${r.platform ? ` (${r.platform})` : ""}${r.hook ? ` : « ${r.hook} »` : ""}`).join("\n") : "Aucun script.");
    }

    case "ajouter_script": {
      const title = String(args.titre ?? "").trim().slice(0, 200);
      const content = String(args.contenu ?? "").trim().slice(0, 20000);
      if (!title || !content) return text("Titre et contenu obligatoires.");
      const platform = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "threads"].includes(String(args.plateforme)) ? String(args.plateforme) : "instagram";
      const { error } = await admin.from("coach_scripts").insert({
        coach_id: ownerId, title, content, status: "a_tourner", platform, format: "reel",
        hook: typeof args.accroche === "string" ? args.accroche.slice(0, 500) : null,
        cta: typeof args.cta === "string" ? args.cta.slice(0, 500) : null,
        pillar: typeof args.pilier === "string" ? args.pilier.slice(0, 100) : null,
        source_reference: "Claude",
      });
      if (error) return text("Ajout impossible, réessaie.");
      return text(`Script « ${title} » ajouté dans ton Studio, à tourner.`);
    }

    case "ajouter_idee_contenu": {
      const title = String(args.titre ?? "").trim().slice(0, 200);
      if (!title) return text("Titre obligatoire.");
      const platform = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "threads", "general"].includes(String(args.plateforme)) ? String(args.plateforme) : "general";
      const { error } = await admin.from("content_ideas").insert({ coach_id: ownerId, title, notes: typeof args.notes === "string" ? args.notes.slice(0, 5000) : null, platform, status: "idee", source: "manuel" });
      if (error) return text("Ajout impossible, réessaie.");
      return text(`Idée « ${title} » ajoutée dans ton Studio.`);
    }

    case "mon_positionnement": {
      const { data } = await admin.from("coach_positioning").select("data").eq("owner_id", ownerId).maybeSingle();
      if (!data) return text("Positionnement pas encore rempli. Le coach peut le faire dans EP Coaching, Business > Ma niche et mon avatar, ou te demander de l'aider puis l'enregistrer avec enregistrer_positionnement.");
      return text(positioningMarkdown(cleanPositioning(data.data)));
    }

    case "enregistrer_positionnement": {
      const { data } = await admin.from("coach_positioning").select("data").eq("owner_id", ownerId).maybeSingle();
      const current = cleanPositioning(data?.data);
      const next: Positioning = { ...current };
      let changed = 0;
      for (const k of POSITIONING_KEYS) {
        if (typeof args[k] === "string") {
          next[k] = (args[k] as string).slice(0, 2000);
          changed++;
        }
      }
      if (!changed) return text("Aucun champ à mettre à jour.");
      const { error } = await admin.from("coach_positioning").upsert({ owner_id: ownerId, data: next, updated_at: new Date().toISOString() }, { onConflict: "owner_id" });
      if (error) return text("Enregistrement impossible, réessaie.");
      return text(`Positionnement mis à jour (${changed} champ(s)). Visible dans EP Coaching, Business > Ma niche et mon avatar.`);
    }
  }
  return null;
}
