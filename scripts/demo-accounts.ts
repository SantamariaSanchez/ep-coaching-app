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

  writeFileSync(out, `Comptes de démonstration EP Coaching\n\nCoach  : ${COACH.email}\nClient : ${CLIENT.email}\nMot de passe (les deux) : ${password}\n`);
  console.log("ok", { coachId, clientId });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
