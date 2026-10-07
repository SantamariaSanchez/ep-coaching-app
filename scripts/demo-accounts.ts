// Comptes de démonstration (revue Apple, captures App Store, tests visuels).
// npm run demo:accounts  → crée ou remet à zéro les comptes et leurs données,
// écrit les identifiants dans le fichier donné en argument (hors du repo).
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const out = process.argv[2];
if (!url || !key || !out) throw new Error("Usage : tsx --env-file=.env.local scripts/demo-accounts.ts <fichier-identifiants>");
const admin = createClient(url, key, { auth: { persistSession: false } });

const COACH = { email: "demo.coach@epcoaching.app", name: "Léa Martin" };
const CLIENT = { email: "demo.client@epcoaching.app", name: "Hugo Bernard" };

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}

async function ensureUser(email: string, password: string): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = list.users.find((u) => u.email === email);
  if (found) {
    await admin.auth.admin.updateUserById(found.id, { password, email_confirm: true });
    return found.id;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser");
  return data.user.id;
}

async function main() {
  const password = `Demo-${randomBytes(6).toString("hex")}!`;
  const now = new Date().toISOString();
  const coachId = await ensureUser(COACH.email, password);
  const clientId = await ensureUser(CLIENT.email, password);

  await admin.from("profiles").upsert({
    id: coachId, role: "coach", full_name: COACH.name, email: COACH.email, status: "active", start_date: daysAgo(90),
    is_platform_owner: false, platform_subscription_status: "active", onboarding_completed_at: now, email_verified_at: now,
    invite_code: `DEMO${randomBytes(2).toString("hex").toUpperCase()}`, terms_accepted_at: now,
    // Jamais dans l'annuaire public des coachs.
    directory_visible: false, accepting_new_clients: false,
  });
  await admin.from("profiles").upsert({
    id: clientId, role: "client", full_name: CLIENT.name, email: CLIENT.email, status: "active", start_date: daysAgo(42),
    coach_id: coachId, subscription_status: "active", subscription_plan: "physique", onboarding_completed_at: now, email_verified_at: now,
    goal: "Perdre 6 kg de gras en gardant ma force", weight_start: 84, terms_accepted_at: now,
  });
  await admin.from("client_intake").upsert(
    { client_id: clientId, gender: "Homme", goal_3_months: "Descendre à 78 kg", goal_12_months: "Être sec toute l'année", height_cm: 180, sessions_current: 4, sessions_desired: 4, avg_daily_steps: 8000 },
    { onConflict: "client_id" }
  );

  // Bilans des 21 derniers jours (coach et client), progression réaliste.
  for (const [id, start] of [[clientId, 84], [coachId, 76]] as const) {
    await admin.from("daily_logs").delete().eq("client_id", id);
    const rows = Array.from({ length: 21 }, (_, i) => {
      const n = 20 - i;
      return {
        client_id: id,
        log_date: daysAgo(n),
        weight_morning: Math.round((start - i * 0.12 + (i % 3 === 0 ? 0.3 : 0)) * 10) / 10,
        sleep_hours: 6.5 + ((i * 7) % 10) / 10,
        sleep_rating: 70 + ((i * 13) % 25),
        steps: 7000 + ((i * 1733) % 5000),
        stress: ["low", "medium", "low"][i % 3],
        digestion: "OK",
        hunger: ["medium", "low", "medium"][i % 3],
        training_name: i % 2 === 0 ? "Push" : null,
        training_rating: i % 2 === 0 ? 8 : null,
      };
    });
    await admin.from("daily_logs").insert(rows);
  }

  // Agenda type du coach.
  await admin.from("schedule_blocks").delete().eq("owner_id", coachId);
  const blocks = [];
  for (let d = 1; d <= 5; d++) {
    blocks.push(
      { owner_id: coachId, day_of_week: d, start_time: "07:00:00", end_time: "07:30:00", label: "Petit-déjeuner", color: "#fbbf24", icon: "repas", tasks: [] },
      { owner_id: coachId, day_of_week: d, start_time: "08:00:00", end_time: "10:00:00", label: "Bilans clients", color: "#60a5fa", icon: "travail", tasks: ["Répondre aux check-ins", "Ajuster les programmes"] },
      { owner_id: coachId, day_of_week: d, start_time: "10:30:00", end_time: "12:00:00", label: "Tournage contenu", color: "#60a5fa", icon: "travail", tasks: ["2 reels", "1 carrousel"] },
      { owner_id: coachId, day_of_week: d, start_time: "12:30:00", end_time: "13:15:00", label: "Déjeuner", color: "#fbbf24", icon: "repas", tasks: [] },
      { owner_id: coachId, day_of_week: d, start_time: "17:30:00", end_time: "19:00:00", label: "Séance : Push", color: "#E01E1E", icon: "salle", tasks: [] }
    );
  }
  await admin.from("schedule_blocks").insert(blocks);

  // Notes de démo.
  await admin.from("notes").delete().eq("owner_id", coachId);
  await admin.from("notes").insert([
    { owner_id: coachId, title: "Idée reel : 3 erreurs en sèche", body: "Hook : tu manges peu et tu ne perds rien ?\n1. Pas de pesée\n2. Week-ends\n3. Pas de pas\n#reel #idée", tags: ["reel", "idée"], kind: "note" },
    { owner_id: coachId, title: "Appel Hugo", body: "Hugo veut garder sa force. Ajuster le volume jambes. Lien avec [[Idée reel : 3 erreurs en sèche]] #client", tags: ["client"], kind: "note" },
    { owner_id: coachId, title: "Préparer la formation nutrition", body: "[ ] Plan des 5 modules", tags: ["formation"], kind: "tache" },
  ]);

  // Stats réseaux saisies à la main (4 semaines).
  const { data: acc } = await admin
    .from("social_accounts")
    .upsert({ owner_id: coachId, platform: "instagram", source: "manuel", connector: "manuel", external_account_id: `manuel:${coachId}`, name: "@lea.coaching", handle: "@lea.coaching", goal_followers: 10000, goal_date: daysAgo(-90) }, { onConflict: "platform,external_account_id" })
    .select("id")
    .single();
  if (acc) {
    await admin.from("social_account_daily").delete().eq("account_id", acc.id);
    await admin.from("social_account_daily").insert(
      [28, 21, 14, 7, 0].map((n, i) => ({ account_id: acc.id, date: daysAgo(n), followers_total: 6200 + i * 180, views: 18000 + i * 4000, reach: 9000 + i * 1500, likes: 900 + i * 120, comments: 60 + i * 10, shares: 40 + i * 9, engagements: 1000 + i * 140, extra: { manuel: true, periode_jours: 7 } }))
    );
  }

  await seedRichDemo(coachId, clientId, password);

  writeFileSync(out, `Comptes de démonstration EP Coaching\n\nCoach  : ${COACH.email}\nClient : ${CLIENT.email}\nMot de passe (les deux) : ${password}\n`);
  console.log("ok", { coachId, clientId });
}

// Données réalistes pour que chaque écran montre l'appli en usage (revue
// Apple, captures du site vitrine) : programme, nutrition, road map, autres
// clients, messages, communauté, lives, contenus, formation, notes.
const FOOD = {
  avoine: "8951ca32-7f06-485b-825b-9937516c227d",
  fromageBlanc: "b88276bd-aa61-41bb-bb2d-86c46e2c5657",
  banane: "90200c76-9dc0-4124-a55f-305208ce6865",
  poulet: "c407974a-8a75-4bb4-afa6-3f2f84bb9a6f",
  riz: "e87f1772-a422-40c3-ab5c-a20c25ae206b",
  brocoli: "20cb2a07-358a-4370-999c-ebb1839a242b",
  oeufs: "872d1b18-c264-4e0f-bf59-ea3a3de9596d",
  painComplet: "fad4746b-d244-4dac-ab9f-1b50572cd07f",
  saumon: "1ced3947-ddff-4c18-9b7a-8ecc6074a405",
  pdt: "44f15140-90c6-46c4-8fa9-e5523877d7ba",
  amandes: "3ccae104-b7f9-4d29-a1df-3d7d878f2deb",
};

async function seedRichDemo(coachId: string, clientId: string, password: string) {
  const today = daysAgo(0);

  // ── Programme de Hugo (4 jours) ──────────────────────────────────────
  await admin.from("programs").delete().eq("client_id", clientId);
  const { data: program } = await admin
    .from("programs")
    .insert({ client_id: clientId, name: "Recomposition, bloc 2", type: "Custom", frequency: 4, is_active: true, objective: "Perdre du gras en gardant la force", mesocycle_start_date: daysAgo(14), mesocycle_weeks: 6 })
    .select("id")
    .single();
  const DAYS: [string, number, [string, string, number, string, number][]][] = [
    ["Push", 1, [["Développé couché", "Pectoraux", 4, "6-8", 2], ["Développé incliné haltères", "Pectoraux", 3, "8-10", 2], ["Développé militaire", "Épaules", 3, "8-10", 2], ["Élévations latérales", "Épaules", 4, "12-15", 1], ["Extension triceps poulie", "Triceps", 3, "10-12", 1]]],
    ["Pull", 2, [["Tractions", "Dos", 4, "6-8", 2], ["Rowing barre", "Dos", 3, "8-10", 2], ["Tirage vertical prise serrée", "Dos", 3, "10-12", 2], ["Face pull", "Épaules", 3, "12-15", 1], ["Curl incliné", "Biceps", 3, "10-12", 1]]],
    ["Jambes", 4, [["Squat", "Quadriceps", 4, "6-8", 2], ["Soulevé de terre roumain", "Ischios", 3, "8-10", 2], ["Presse à cuisses", "Quadriceps", 3, "10-12", 1], ["Leg curl assis", "Ischios", 3, "10-12", 1], ["Mollets debout", "Mollets", 4, "10-15", 1]]],
    ["Haut du corps", 5, [["Développé couché haltères", "Pectoraux", 3, "8-10", 2], ["Rowing haltère", "Dos", 3, "8-10", 2], ["Développé Arnold", "Épaules", 3, "10-12", 2], ["Curl marteau", "Biceps", 3, "10-12", 1], ["Dips", "Triceps", 3, "8-12", 1]]],
  ];
  if (program) {
    for (const [i, [label, weekday, exercises]] of DAYS.entries()) {
      const { data: day } = await admin.from("program_days").insert({ program_id: program.id, day_label: label, position: i, weekday }).select("id").single();
      if (!day) continue;
      await admin.from("exercises").insert(
        exercises.map(([name, muscle, sets, reps, rir], position) => ({ day_id: day.id, name, muscle_group: muscle, sets, reps, rir, rest_seconds: position < 2 ? 150 : 90, position, is_direct: true }))
      );
    }
  }

  // Historique de séances (3 semaines) pour le logbook et les records.
  await admin.from("workout_logs").delete().eq("client_id", clientId);
  const logs = [];
  for (let w = 3; w >= 1; w--) {
    const base = 72.5 + (3 - w) * 2.5;
    logs.push(
      { client_id: clientId, exercise_name: "Développé couché", muscle_group: "Pectoraux", is_direct: true, sets_completed: 4, reps: "8", weight_kg: base, rir_actual: 2, logged_at: daysAgo(w * 7 - 1) },
      { client_id: clientId, exercise_name: "Squat", muscle_group: "Quadriceps", is_direct: true, sets_completed: 4, reps: "7", weight_kg: base + 25, rir_actual: 2, logged_at: daysAgo(w * 7 - 3) },
      { client_id: clientId, exercise_name: "Tractions", muscle_group: "Dos", is_direct: true, sets_completed: 4, reps: "8", weight_kg: (3 - w) * 2.5, rir_actual: 2, logged_at: daysAgo(w * 7 - 2) }
    );
  }
  await admin.from("workout_logs").insert(logs);

  // ── Plan nutrition + repas du jour ───────────────────────────────────
  await admin.from("diet_plans").delete().eq("client_id", clientId);
  const { data: plan } = await admin
    .from("diet_plans")
    .insert({ client_id: clientId, name: "Sèche douce, 2 300 kcal", mode: "fixed", is_active: true, created_by: coachId, objective: "Déficit léger, protéines hautes" })
    .select("id")
    .single();
  const MEALS: [string, string, number][] = [
    ["breakfast", FOOD.avoine, 70], ["breakfast", FOOD.fromageBlanc, 200], ["breakfast", FOOD.banane, 120],
    ["lunch", FOOD.poulet, 180], ["lunch", FOOD.riz, 220], ["lunch", FOOD.brocoli, 200],
    ["afternoon", FOOD.painComplet, 60], ["afternoon", FOOD.oeufs, 100], ["afternoon", FOOD.amandes, 20],
    ["dinner", FOOD.saumon, 150], ["dinner", FOOD.pdt, 250], ["dinner", FOOD.brocoli, 150],
  ];
  if (plan) {
    const { data: planMeals } = await admin
      .from("diet_plan_meals")
      .insert(MEALS.map(([meal_slot, food_id, quantity_g], position) => ({ plan_id: plan.id, meal_slot, food_id, quantity_g, position })))
      .select("id, meal_slot, food_id, quantity_g");
    const { data: foods } = await admin.from("foods").select("id, calories_per_100, proteins_per_100, carbs_per_100, fats_per_100").in("id", Object.values(FOOD));
    const byId = new Map((foods ?? []).map((f) => [f.id as string, f]));
    await admin.from("food_logs").delete().eq("client_id", clientId);
    const eaten = (planMeals ?? []).filter((m) => m.meal_slot === "breakfast" || m.meal_slot === "lunch");
    await admin.from("food_logs").insert(
      eaten.map((m) => {
        const f = byId.get(m.food_id as string);
        const k = Number(m.quantity_g) / 100;
        return {
          client_id: clientId, food_id: m.food_id, meal_slot: m.meal_slot, quantity_g: m.quantity_g, logged_at: today, diet_plan_meal_id: m.id,
          calories: Math.round(Number(f?.calories_per_100 ?? 0) * k), proteins: Math.round(Number(f?.proteins_per_100 ?? 0) * k),
          carbs: Math.round(Number(f?.carbs_per_100 ?? 0) * k), fats: Math.round(Number(f?.fats_per_100 ?? 0) * k),
        };
      })
    );
  }

  // ── Stock de courses (inventaire) ────────────────────────────────────
  await admin.from("pantry_items").delete().eq("owner_id", clientId);
  await admin.from("pantry_items").insert([
    { owner_id: clientId, food_id: FOOD.banane, name: "Banane", category: "Fruits", unit: "piece", quantity: 2, grams_per_unit: 120, low_threshold: 2 },
    { owner_id: clientId, food_id: FOOD.riz, name: "Riz basmati cuit", category: "Feculents", unit: "g", quantity: 1300, low_threshold: 400 },
    { owner_id: clientId, food_id: FOOD.poulet, name: "Poulet blanc cuit", category: "Viandes", unit: "g", quantity: 540, low_threshold: 300 },
    { owner_id: clientId, food_id: FOOD.oeufs, name: "Oeuf entier cuit", category: "Oeufs", unit: "piece", quantity: 8, grams_per_unit: 60, low_threshold: 4 },
    { owner_id: clientId, food_id: FOOD.fromageBlanc, name: "Fromage blanc 3%", category: "Laitiers", unit: "g", quantity: 0, low_threshold: 200 },
    { owner_id: clientId, food_id: FOOD.avoine, name: "Flocons d'avoine", category: "Cereales", unit: "g", quantity: 900, low_threshold: 200 },
  ]);

  // ── Road Map ─────────────────────────────────────────────────────────
  await admin.from("roadmaps").delete().eq("client_id", clientId);
  const { data: roadmap } = await admin
    .from("roadmaps")
    .insert({ client_id: clientId, created_by: coachId, start_date: daysAgo(42), end_date: daysAgo(-140) })
    .select("id")
    .single();
  if (roadmap) {
    await admin.from("roadmap_phases").insert([
      { roadmap_id: roadmap.id, type: "deficit", label: "Sèche douce", start_date: daysAgo(42), end_date: daysAgo(-42), notes: "Objectif 78 kg en gardant la force", position: 0 },
      { roadmap_id: roadmap.id, type: "maintenance", label: "Maintien", start_date: daysAgo(-41), end_date: daysAgo(-70), notes: "Stabiliser le poids", position: 1 },
      { roadmap_id: roadmap.id, type: "masse", label: "Prise de muscle propre", start_date: daysAgo(-69), end_date: daysAgo(-140), notes: "Surplus léger", position: 2 },
    ]);
  }

  // ── Autres clients de la coach (portefeuille réaliste) ───────────────
  const others = [
    { email: "demo.client2@epcoaching.app", name: "Inès Moreau", goal: "Prendre du muscle sur le haut du corps", start: 61 },
    { email: "demo.client3@epcoaching.app", name: "Karim Haddad", goal: "Préparer sa première compétition", start: 88 },
    { email: "demo.client4@epcoaching.app", name: "Chloé Lambert", goal: "Retrouver la forme après une grossesse", start: 67 },
  ];
  for (const [n, o] of others.entries()) {
    const id = await ensureUser(o.email, password);
    await admin.from("profiles").upsert({
      id, role: "client", full_name: o.name, email: o.email, status: "active", start_date: daysAgo(20 + n * 15), coach_id: coachId,
      subscription_status: "active", subscription_plan: "physique", onboarding_completed_at: new Date().toISOString(), email_verified_at: new Date().toISOString(),
      goal: o.goal, weight_start: o.start, terms_accepted_at: new Date().toISOString(),
    });
    await admin.from("daily_logs").delete().eq("client_id", id);
    await admin.from("daily_logs").insert(
      Array.from({ length: 14 - n * 4 }, (_, i) => ({
        client_id: id, log_date: daysAgo(13 - i), weight_morning: Math.round((o.start - i * 0.08) * 10) / 10,
        sleep_hours: 7 + (i % 3) * 0.3, steps: 6500 + ((i * 911) % 4000), stress: "low", digestion: "OK", hunger: "medium",
      }))
    );
  }

  // ── Messages coach ↔ Hugo ────────────────────────────────────────────
  await admin.from("messages").delete().eq("conversation_id", clientId);
  const msg = (from: string, to: string, content: string, minutesAgo: number, read = true) => ({
    conversation_id: clientId, sender_id: from, receiver_id: to, type: "text", content, is_read: read,
    created_at: new Date(Date.now() - minutesAgo * 60000).toISOString(),
  });
  await admin.from("messages").insert([
    msg(clientId, coachId, "Salut Léa, j'ai fait 80 kg x 8 au développé couché ce matin, record battu !", 300),
    msg(coachId, clientId, "Énorme Hugo ! Et avec 2 reps en réserve en plus. On monte à 82,5 kg la semaine prochaine.", 280),
    msg(clientId, coachId, "Par contre j'ai eu faim le soir hier, je peux bouger une collation ?", 90),
    msg(coachId, clientId, "Oui : décale la collation de 16h à 21h, même contenu. Tes calories ne changent pas.", 60, false),
  ]);

  // ── Communauté ───────────────────────────────────────────────────────
  await admin.from("community_posts").delete().eq("author_id", clientId);
  await admin.from("community_posts").insert([
    { author_id: clientId, type: "victory", content: "6 semaines de suivi : -3,4 kg sur la balance et 80 kg au développé couché. Je n'avais jamais tenu aussi longtemps.", status: "open" },
    { author_id: clientId, type: "question", content: "Vous prenez votre créatine le matin ou après la séance ?", status: "open" },
  ]);

  // ── Lives de la coach ────────────────────────────────────────────────
  await admin.from("live_events").delete().eq("host_id", coachId);
  const at = (days: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  await admin.from("live_events").insert([
    { host_id: coachId, title: "Check-in hebdo avec Hugo", type: "checkin_hebdo", invited_client_id: clientId, room_slug: `demo-${randomBytes(4).toString("hex")}`, starts_at: at(1, 18), duration_minutes: 20 },
    { host_id: coachId, title: "Atelier : manger au restaurant sans casser sa sèche", type: "atelier", room_slug: `demo-${randomBytes(4).toString("hex")}`, starts_at: at(3, 19), duration_minutes: 45 },
    { host_id: coachId, title: "Questions-réponses du mois", type: "qna", room_slug: `demo-${randomBytes(4).toString("hex")}`, starts_at: at(6, 20), duration_minutes: 60 },
  ]);

  // ── Studio créatif de la coach ───────────────────────────────────────
  await admin.from("coach_scripts").delete().eq("coach_id", coachId);
  await admin.from("coach_scripts").insert([
    { coach_id: coachId, title: "3 erreurs qui bloquent ta sèche", format: "court", platform: "instagram", status: "a_tourner", duration_seconds: 45, pillar: "Nutrition", hook: "Tu manges peu et tu ne perds rien ? Regarde ça.", content: "Tu manges peu et tu ne perds rien ?\n\nErreur 1 : tu ne pèses rien, donc tu sous-estimes tout.\n\nErreur 2 : tu tiens la semaine et tu lâches tout le week-end.\n\nErreur 3 : tu ne marches plus depuis que tu fais de la muscu.\n\nLe guide complet est dans ma bio.", cta: "Le guide complet est dans ma bio." },
    { coach_id: coachId, title: "Pourquoi tes bras ne grossissent pas", format: "court", platform: "tiktok", status: "a_tourner", duration_seconds: 38, pillar: "Entraînement", hook: "Tu fais des curls tous les jours et tes bras ne bougent pas ?", content: "Tu fais des curls tous les jours et tes bras ne bougent pas ?\n\nLe triceps, c'est deux tiers du bras.\n\nFais-le travailler en étirement, pas seulement en fin de séance.", cta: "Mon programme bras est dans ma bio." },
    { coach_id: coachId, title: "Ma routine du dimanche soir", format: "court", platform: "instagram", status: "tourne", duration_seconds: 30, pillar: "Organisation", hook: "20 minutes le dimanche, et ta semaine est gagnée.", content: "20 minutes le dimanche.\n\nJe prépare mes repas, je cale mes séances dans l'agenda, je relis mes objectifs.\n\nEt la semaine se déroule toute seule.", cta: "Le modèle d'agenda est dans ma bio." },
    { coach_id: coachId, title: "Le vrai prix d'un coaching raté", format: "long", platform: "youtube", status: "publie", duration_seconds: 720, pillar: "Business", hook: "Un client qui abandonne au bout de 3 semaines, ça te coûte plus que son abonnement.", content: "Script complet de la vidéo.", cta: "Le lien est en description.", views: 4200, likes: 310, comments_count: 42, shares: 18, saves: 95 },
  ]);

  // ── Formation de la coach ────────────────────────────────────────────
  const { data: oldFormations } = await admin.from("formations").select("id").eq("owner_id", coachId);
  for (const f of oldFormations ?? []) {
    const { data: mods } = await admin.from("formation_modules").select("id").eq("formation_id", f.id);
    for (const m of mods ?? []) {
      await admin.from("formation_lessons").delete().eq("module_id", m.id);
      await admin.from("formation_sections").delete().eq("module_id", m.id);
    }
    await admin.from("formation_modules").delete().eq("formation_id", f.id);
    await admin.from("formations").delete().eq("id", f.id);
  }
  const { data: formation } = await admin
    .from("formations")
    .insert({ owner_id: coachId, slug: `seche-sans-souffrir-${coachId.slice(0, 6)}`, title: "Sèche sans souffrir", subtitle: "Perdre du gras sans perdre ta vie sociale", emoji: "🔥", color: "#E01E1E", is_published: true, access_mode: "inclus", order_index: 0 })
    .select("id")
    .single();
  if (formation) {
    const { data: mod } = await admin.from("formation_modules").insert({ formation_id: formation.id, title: "Les bases", order_index: 0 }).select("id").single();
    if (mod) {
      await admin.from("formation_lessons").insert(
        ["Pourquoi tu ne perds pas", "Calculer tes besoins en 5 minutes", "Le repas type qui cale", "Gérer les week-ends", "Quand ajuster (et quand attendre)"].map((title, i) => ({ module_id: mod.id, title, duration_min: 6 + i * 2, order_index: i, is_published: true }))
      );
    }
  }

  // ── Notes de Hugo ────────────────────────────────────────────────────
  await admin.from("notes").delete().eq("owner_id", clientId);
  await admin.from("notes").insert([
    { owner_id: clientId, title: "Réglages machines", body: "Presse : dossier cran 4, pieds hauts.\nTirage : cale genoux cran 3.\n#salle", tags: ["salle"], kind: "note" },
    { owner_id: clientId, title: "Repas faciles au boulot", body: "Riz + poulet la veille, skyr en collation. Voir [[Courses de la semaine]] #nutrition", tags: ["nutrition"], kind: "note" },
    { owner_id: clientId, title: "Courses de la semaine", body: "[ ] Poulet\n[ ] Riz basmati\n[ ] Fromage blanc\n[ ] Bananes", tags: ["courses"], kind: "tache" },
  ]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
