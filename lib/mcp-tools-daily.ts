// Outils du quotidien pour le connecteur Claude (2026-10-14) : relances,
// check-ins, messages, agenda, scripts du Studio, guides et résumé business
// pour un coach ; séance, diète, séries et progrès pour un client. Mêmes
// règles que lib/mcp-tools.ts : chaque outil n'agit que sur les données du
// propriétaire de la clé et, pour un coach, sur SES clients (coach_id), jamais
// ceux d'un autre coach. Toutes les entrées sont bornées et validées ici.
import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis, nowInParis } from "@/lib/dates";
import { fuzzyScore } from "@/lib/fuzzy-search";
import { getPrioritizedCoachView } from "@/lib/coach-analytics";
import { TRAFFIC_LIGHT_QUESTION } from "@/lib/client-traffic-light";
import { notifyUser } from "@/lib/notify";
import { sendPushToUser } from "@/lib/push";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { isBlockOnDate } from "@/lib/agenda-day";
import { isBlockTimeAlreadyPastToday } from "@/lib/schedule-time";
import { getActivePlan } from "@/lib/nutrition-sync";
import { MEAL_SLOTS, planItemsFor, slotLabel } from "@/lib/nutrition-engine";
import { searchLeadMagnets, getCoachLeadMagnets } from "@/lib/lead-magnets";
import { isRealAccount } from "@/lib/internal-accounts";
import { CONTENT_FORMAT_IDS, contentFormatsToolHint, getContentFormat, isContentFormatId } from "@/lib/content-formats";
import { isMissingColumnError } from "@/lib/coach-ideation";

type Role = "coach" | "client" | "staff";
type ToolDef = { name: string; description: string; inputSchema: Record<string, unknown>; roles: Role[] };
type Admin = ReturnType<typeof createAdminClient>;

const ALL: Role[] = ["coach", "client", "staff"];
const SCRIPT_REF = { type: "string", description: "Identifiant court donné par mes_scripts (8 caractères) ou titre du script" };

export const DAILY_TOOLS: ToolDef[] = [
  // ── Coach ────────────────────────────────────────────────────────────────
  {
    name: "clients_a_relancer",
    roles: ["coach"],
    description: "Clients du coach qui ont besoin d'attention maintenant : alertes (check-in manquant, séances insuffisantes, nutrition non notée, poids qui stagne, récupération faible...), clients silencieux depuis 30 jours et bilans hebdo qui attendent une réponse.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "lire_checkin",
    roles: ["coach"],
    description: "Lit le bilan hebdo (check-in) d'un client du coach : ses réponses, ses chiffres et le retour déjà envoyé. Par défaut le plus récent.",
    inputSchema: {
      type: "object",
      properties: {
        client: { type: "string", description: "Nom ou email du client (tolérant aux fautes)" },
        semaine: { type: "string", description: "Lundi de la semaine, AAAA-MM-JJ (optionnel)" },
      },
      required: ["client"],
    },
  },
  {
    name: "repondre_checkin",
    roles: ["coach"],
    description: "Envoie (ou corrige) le retour du coach sur le bilan hebdo d'un client. Le client est prévenu par notification. Par défaut le bilan le plus récent.",
    inputSchema: {
      type: "object",
      properties: {
        client: { type: "string", description: "Nom ou email du client" },
        retour: { type: "string", description: "Le retour écrit, en tutoyant le client" },
        note: { type: "number", description: "Note de la semaine de 1 à 10 (optionnel)" },
        semaine: { type: "string", description: "Lundi de la semaine, AAAA-MM-JJ (optionnel)" },
      },
      required: ["client", "retour"],
    },
  },
  {
    name: "envoyer_message",
    roles: ["coach"],
    description: "Envoie un message écrit à un client du coach, dans sa conversation EP Coaching (il reçoit aussi une notification). À n'utiliser qu'après accord du coach sur le texte.",
    inputSchema: {
      type: "object",
      properties: {
        client: { type: "string", description: "Nom ou email du client" },
        texte: { type: "string", description: "Le message, 2000 caractères maximum" },
      },
      required: ["client", "texte"],
    },
  },
  {
    name: "modifier_script",
    roles: ["coach"],
    description: "Met à jour un script du Studio créatif : titre, accroche, contenu, appel à l'action, description (légende du post), format de contenu (format_contenu) ou statut (a_tourner, tourne). Seuls les champs donnés changent. Si tu changes de format, réécris aussi le contenu dans la forme du nouveau format : " + contentFormatsToolHint() + ".",
    inputSchema: {
      type: "object",
      properties: {
        script: SCRIPT_REF,
        titre: { type: "string" },
        accroche: { type: "string" },
        contenu: { type: "string" },
        cta: { type: "string" },
        description: { type: "string", description: "Légende / description du post" },
        format_contenu: { type: "string", enum: CONTENT_FORMAT_IDS, description: "Format de contenu (face_cam, clone, tier_list...)" },
        statut: { type: "string", enum: ["a_tourner", "tourne"] },
      },
      required: ["script"],
    },
  },
  {
    name: "publier_script",
    roles: ["coach"],
    description: "Marque un script du Studio comme publié : il sort du Studio et rejoint l'historique des contenus publiés (pour ne jamais refaire le même sujet).",
    inputSchema: { type: "object", properties: { script: SCRIPT_REF }, required: ["script"] },
  },
  {
    name: "lister_guides",
    roles: ["coach"],
    description: "Guides gratuits EP Coaching (lead magnets) avec leur numéro à faire commenter dans les reels (ex. « commente 131 ») et leur lien. Recherche par mots clés, ou les guides écrits par le coach lui-même.",
    inputSchema: {
      type: "object",
      properties: {
        recherche: { type: "string", description: "Mots clés (optionnel)" },
        nombre: { type: "number", description: "1 à 50, 15 par défaut" },
        mes_guides: { type: "boolean", description: "true pour seulement les guides écrits par le coach" },
      },
    },
  },
  {
    name: "resume_business",
    roles: ["coach"],
    description: "Résumé business du coach sur une période : clients (payants, nouveaux), bilans à traiter, revenus et dépenses notés, appels de vente, abonnés réseaux et contenus.",
    inputSchema: { type: "object", properties: { jours: { type: "number", description: "7 à 365, 30 par défaut" } } },
  },
  // ── Tout le monde (agenda) ───────────────────────────────────────────────
  {
    name: "mon_agenda",
    roles: ALL,
    description: "Agenda d'une journée dans EP Coaching (blocs horaires, tâches, rappels). Par défaut aujourd'hui.",
    inputSchema: { type: "object", properties: { date: { type: "string", description: "AAAA-MM-JJ, aujourd'hui par défaut" } } },
  },
  {
    name: "ajouter_bloc_agenda",
    roles: ALL,
    description: "Ajoute un bloc dans l'agenda EP Coaching : ponctuel (une date) ou chaque semaine (jours 1 = lundi à 7 = dimanche). Avec rappel par notification au début du bloc si demandé.",
    inputSchema: {
      type: "object",
      properties: {
        titre: { type: "string" },
        debut: { type: "string", description: "HH:MM" },
        fin: { type: "string", description: "HH:MM" },
        date: { type: "string", description: "AAAA-MM-JJ pour un bloc ponctuel" },
        jours: { type: "array", items: { type: "number" }, description: "Pour un bloc chaque semaine : 1 = lundi ... 7 = dimanche" },
        notes: { type: "string" },
        rappel: { type: "boolean", description: "Notification au début du bloc" },
      },
      required: ["titre", "debut", "fin"],
    },
  },
  // ── Client (et coach pour son propre suivi) ──────────────────────────────
  {
    name: "ma_seance_du_jour",
    roles: ALL,
    description: "Séance prévue dans le programme EP Coaching pour un jour donné (exercices, séries, reps, RIR, repos, consignes) et ce qui a déjà été noté. Par défaut aujourd'hui.",
    inputSchema: { type: "object", properties: { date: { type: "string", description: "AAAA-MM-JJ, aujourd'hui par défaut" } } },
  },
  {
    name: "ma_diete_du_jour",
    roles: ALL,
    description: "Diète prévue par le plan nutrition EP Coaching pour un jour (repas, aliments, grammes, calories et macros) et ce qui a déjà été mangé. Par défaut aujourd'hui.",
    inputSchema: { type: "object", properties: { date: { type: "string", description: "AAAA-MM-JJ, aujourd'hui par défaut" } } },
  },
  {
    name: "enregistrer_serie",
    roles: ALL,
    description: "Enregistre une série dans la séance du jour EP Coaching (la séance est démarrée si besoin). La séance se termine ensuite dans l'appli pour compter dans le carnet et les records.",
    inputSchema: {
      type: "object",
      properties: {
        exercice: { type: "string" },
        charge_kg: { type: "number", description: "0 pour le poids du corps" },
        reps: { type: "number" },
        rir: { type: "number", description: "Répétitions en réserve, 0 à 10 (optionnel)" },
        numero_serie: { type: "number", description: "Optionnel, sinon la série suivante" },
        seance: { type: "string", description: "Nom du jour du programme (optionnel, sinon celui d'aujourd'hui)" },
      },
      required: ["exercice", "charge_kg", "reps"],
    },
  },
  {
    name: "mes_progres",
    roles: ALL,
    description: "Progrès sur plusieurs semaines dans EP Coaching : poids moyen semaine par semaine, séances terminées, records battus, jours de nutrition notés, pas et sommeil moyens.",
    inputSchema: { type: "object", properties: { semaines: { type: "number", description: "2 à 26, 8 par défaut" } } },
  },
];

const text = (t: string) => ({ content: [{ type: "text", text: t }] });
const fr = (n: number, d = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`));
const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.trim());
const shift = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const isoDowOf = (date: string) => {
  const js = new Date(`${date}T12:00:00Z`).getUTCDay();
  return js === 0 ? 7 : js;
};
const numArg = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const DAYS = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

async function limited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const r = await checkRateLimit(key, limit, windowSeconds);
  return !r.allowed;
}

/** Un client DU coach, retrouvé par nom ou email (jamais celui d'un autre coach). */
async function findOwnClient(admin: Admin, coachId: string, query: string): Promise<{ id: string; name: string } | null> {
  const q = query.trim().slice(0, 100);
  if (!q) return null;
  const { data } = await admin.from("profiles").select("id, full_name, email").eq("coach_id", coachId).eq("role", "client").neq("id", coachId).limit(300);
  const list = (data ?? []) as { id: string; full_name: string | null; email: string | null }[];
  const best = list
    .map((c) => ({ c, s: Math.max(fuzzyScore(c.full_name ?? "", q), fuzzyScore(c.email ?? "", q)) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)[0]?.c;
  return best ? { id: best.id, name: best.full_name ?? best.email ?? "Client" } : null;
}

/** Un script du coach, par identifiant court (mes_scripts) ou par titre. */
async function findOwnScript(admin: Admin, coachId: string, ref: string) {
  const r = ref.trim().slice(0, 200);
  if (!r) return null;
  const { data } = await admin.from("coach_scripts").select("id, title, hook, pillar, platform, source_reference").eq("coach_id", coachId).limit(500);
  const list = (data ?? []) as { id: string; title: string; hook: string | null; pillar: string | null; platform: string | null; source_reference: string | null }[];
  if (/^[0-9a-f-]{8,36}$/i.test(r)) {
    const byId = list.find((s) => s.id.toLowerCase().startsWith(r.toLowerCase()));
    if (byId) return byId;
  }
  return list.map((s) => ({ s, sc: fuzzyScore(s.title, r) })).filter((x) => x.sc >= 0).sort((a, b) => b.sc - a.sc)[0]?.s ?? null;
}

async function findCheckin(admin: Admin, clientId: string, week: unknown) {
  let q = admin
    .from("check_ins")
    .select("id, week_start, weight_avg, nutrition_adherence, sleep_hours, general_feeling, biggest_win, upcoming_obstacles, coach_questions, client_notes, coach_notes, coach_rating, coach_replied_at")
    .eq("client_id", clientId)
    .order("week_start", { ascending: false })
    .limit(1);
  if (isDate(week)) q = q.eq("week_start", week);
  const { data } = await q.maybeSingle();
  return data as Record<string, string | number | null> | null;
}

type ProgramDayRow = { id: string; day_label: string; weekday: number | null; position: number; notes?: string | null };
type ExerciseRow = { day_id: string; name: string; sets: number | null; reps: string | null; rir: number | null; rest_seconds: number | null; notes: string | null; position: number; tempo?: string | null };

async function activeProgram(admin: Admin, userId: string) {
  const { data: prog } = await admin.from("programs").select("id, name").eq("client_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!prog) return null;
  const { data: days } = await admin.from("program_days").select("*").eq("program_id", prog.id).order("position");
  return { id: prog.id as string, name: prog.name as string, days: (days ?? []) as ProgramDayRow[] };
}

export function dailyToolsForRole(role: Role) {
  return DAILY_TOOLS.filter((t) => t.roles.includes(role)).map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
}

export async function callDailyTool(ownerId: string, role: Role, name: string, args: Record<string, unknown>) {
  const tool = DAILY_TOOLS.find((t) => t.name === name);
  if (!tool) return null;
  if (!tool.roles.includes(role)) return text("Cet outil est réservé aux coachs.");
  const admin = createAdminClient();
  const today = todayInParis();

  switch (name) {
    case "clients_a_relancer": {
      const { flagged, quiet, onTrack } = await getPrioritizedCoachView(ownerId);
      const { data: clients } = await admin.from("profiles").select("id, full_name").eq("coach_id", ownerId).eq("role", "client").neq("id", ownerId).limit(300);
      const names = new Map(((clients ?? []) as { id: string; full_name: string | null }[]).map((c) => [c.id, c.full_name ?? "Sans nom"]));
      const { data: pending } = names.size
        ? await admin.from("check_ins").select("client_id, week_start").is("coach_replied_at", null).gte("week_start", shift(today, -21)).in("client_id", [...names.keys()]).order("week_start", { ascending: false })
        : { data: [] };
      const lines: string[] = [];
      if (flagged.length) {
        lines.push(`${flagged.length} client(s) avec une alerte :`);
        for (const f of flagged.slice(0, 30)) lines.push(`- [${f.light}] ${f.clientName ?? "Sans nom"} : ${f.alerts.map((a) => `${a.label} (${a.severity === "high" ? "urgent" : a.severity === "medium" ? "à surveiller" : "léger"})`).join(" ; ")}. Piste : ${f.alerts[0].suggestion} ${TRAFFIC_LIGHT_QUESTION[f.light]}`);
      }
      const pend = (pending ?? []) as { client_id: string; week_start: string }[];
      if (pend.length) {
        lines.push(`${pend.length} bilan(s) hebdo en attente de ta réponse :`);
        for (const p of pend.slice(0, 30)) lines.push(`- ${names.get(p.client_id) ?? "Client"}, semaine du ${p.week_start}`);
      }
      if (quiet.length) {
        lines.push(`${quiet.length} client(s) sans appel depuis 30 jours ou plus :`);
        for (const q of quiet.slice(0, 30)) lines.push(`- ${q.clientName ?? "Sans nom"} : ${q.lastContactDays == null ? "jamais eu d'appel" : `dernier appel il y a ${q.lastContactDays} jours`}`);
      }
      if (onTrack.length) {
        lines.push(`${onTrack.length} client(s) au vert, à féliciter : ${onTrack.slice(0, 30).map((o) => o.clientName ?? "Sans nom").join(", ")}`);
      }
      return text(lines.length ? lines.join("\n") : "Personne à relancer : aucun signal sur tes clients actifs.");
    }

    case "lire_checkin": {
      const client = await findOwnClient(admin, ownerId, str(args.client, 100));
      if (!client) return text("Aucun de tes clients ne correspond à ce nom.");
      const c = await findCheckin(admin, client.id, args.semaine);
      if (!c) return text(`Aucun bilan hebdo trouvé pour ${client.name}${isDate(args.semaine) ? ` la semaine du ${args.semaine}` : ""}.`);
      const lines = [
        `Bilan hebdo de ${client.name}, semaine du ${c.week_start}`,
        c.weight_avg != null ? `Poids moyen : ${fr(Number(c.weight_avg), 1)} kg` : null,
        c.nutrition_adherence != null ? `Adhésion nutrition : ${c.nutrition_adherence}` : null,
        c.sleep_hours != null ? `Sommeil : ${c.sleep_hours} h` : null,
        c.general_feeling != null ? `Ressenti général : ${c.general_feeling}` : null,
        c.biggest_win ? `Sa plus grande victoire : ${c.biggest_win}` : null,
        c.upcoming_obstacles ? `Obstacles à venir : ${c.upcoming_obstacles}` : null,
        c.coach_questions ? `Ses questions : ${c.coach_questions}` : null,
        c.client_notes ? `Ses notes : ${c.client_notes}` : null,
        c.coach_replied_at ? `Ton retour (envoyé) : ${c.coach_notes ?? ""}${c.coach_rating != null ? `, note ${c.coach_rating}/10` : ""}` : "Pas encore de retour de ta part.",
      ].filter(Boolean);
      return text(lines.join("\n"));
    }

    case "repondre_checkin": {
      const retour = str(args.retour, 5000);
      if (!retour) return text("Le retour est vide, rien n'a été envoyé.");
      if (await limited(`mcp-checkin-reply:${ownerId}`, PRESETS.write.limit, PRESETS.write.windowSeconds)) return text("Trop d'envois d'un coup, réessaie dans un instant.");
      const client = await findOwnClient(admin, ownerId, str(args.client, 100));
      if (!client) return text("Aucun de tes clients ne correspond à ce nom.");
      const c = await findCheckin(admin, client.id, args.semaine);
      if (!c) return text(`Aucun bilan hebdo trouvé pour ${client.name}.`);
      const note = args.note === undefined ? null : numArg(args.note, 1, 10);
      if (args.note !== undefined && note === null) return text("La note doit être entre 1 et 10.");
      const isUpdate = c.coach_replied_at != null;
      const { error } = await admin
        .from("check_ins")
        .update({ coach_notes: retour, ...(note !== null ? { coach_rating: Math.round(note) } : {}), coach_replied_at: new Date().toISOString() })
        .eq("id", String(c.id))
        .eq("client_id", client.id);
      if (error) return text("Envoi impossible, réessaie.");
      const flat = retour.replace(/\s+/g, " ");
      await notifyUser(client.id, {
        type: isUpdate ? "client_checkin_reply_updated" : "client_checkin_reply",
        title: isUpdate ? "Ton coach a mis à jour son retour" : "Ton coach a répondu à ton check-in",
        body: flat.length > 90 ? `${flat.slice(0, 90)}…` : flat,
        url: "/dashboard/client/checkin",
        senderId: ownerId,
      }).catch(() => undefined);
      return text(`Retour ${isUpdate ? "mis à jour" : "envoyé"} à ${client.name} (semaine du ${c.week_start}). Il a reçu une notification.`);
    }

    case "envoyer_message": {
      const texte = str(args.texte, 2000);
      if (!texte) return text("Message vide, rien n'a été envoyé.");
      if (await limited(`mcp-message:${ownerId}`, 60, 3600)) return text("Trop de messages envoyés cette heure-ci, réessaie plus tard.");
      const client = await findOwnClient(admin, ownerId, str(args.client, 100));
      if (!client) return text("Aucun de tes clients ne correspond à ce nom.");
      const { error } = await admin.from("messages").insert({ conversation_id: client.id, sender_id: ownerId, receiver_id: client.id, type: "text", content: texte, is_read: false });
      if (error) return text("Envoi impossible, réessaie.");
      await sendPushToUser(client.id, "Message de ton coach", texte.slice(0, 140), "/dashboard/client/messages").catch(() => undefined);
      return text(`Message envoyé à ${client.name}.`);
    }

    case "modifier_script": {
      const script = await findOwnScript(admin, ownerId, str(args.script, 200));
      if (!script) return text("Script introuvable dans ton Studio. Utilise mes_scripts pour voir les identifiants.");
      const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
      if (typeof args.titre === "string") {
        const t = str(args.titre, 200);
        if (!t) return text("Le titre ne peut pas être vide.");
        patch.title = t;
      }
      if (typeof args.accroche === "string") patch.hook = str(args.accroche, 500) || null;
      if (typeof args.contenu === "string") patch.content = str(args.contenu, 20000) || null;
      if (typeof args.cta === "string") patch.cta = str(args.cta, 500) || null;
      if (typeof args.description === "string") patch.instagram_caption = str(args.description, 5000) || null;
      if (typeof args.statut === "string") {
        if (!["a_tourner", "tourne"].includes(args.statut)) return text("Statut invalide : a_tourner ou tourne (pour publier, utilise publier_script).");
        patch.status = args.statut;
      }
      if (args.format_contenu !== undefined && args.format_contenu !== null && args.format_contenu !== "") {
        if (!isContentFormatId(args.format_contenu)) return text(`Format de contenu inconnu. Valeurs possibles : ${CONTENT_FORMAT_IDS.join(", ")}.`);
        patch.content_format = args.format_contenu;
      }
      if (Object.keys(patch).length === 1) return text("Aucun champ à modifier.");
      // Sauvegarde l'ancien texte avant de le remplacer (colonne previous_version),
      // pour pouvoir revenir en arrière. Le plus ancien état reste dans `earlier_version`.
      if (patch.title !== undefined || patch.hook !== undefined || patch.content !== undefined || patch.cta !== undefined || patch.instagram_caption !== undefined) {
        const { data: before } = await admin.from("coach_scripts").select("title, hook, content, cta, pillar, source_reference, instagram_caption, previous_version").eq("id", script.id).eq("coach_id", ownerId).maybeSingle();
        if (before) {
          const { previous_version: older, ...current } = before as Record<string, unknown>;
          await admin.from("coach_scripts").update({ previous_version: { ...current, raison: "Modification via Claude", saved_at: new Date().toISOString(), ...(older ? { earlier_version: older } : {}) } }).eq("id", script.id).eq("coach_id", ownerId);
        }
      }
      const { error } = await admin.from("coach_scripts").update(patch).eq("id", script.id).eq("coach_id", ownerId);
      if (error && patch.content_format && isMissingColumnError(error)) return text("Les formats de contenu ne sont pas encore activés dans la base EP Coaching. Réessaie sans format_contenu.");
      if (error) return text("Modification impossible, réessaie.");
      if (patch.content_format) return text(`Script « ${patch.title ?? script.title} » mis à jour (${Object.keys(patch).length - 1} champ(s)), format ${getContentFormat(patch.content_format).label}.`);
      return text(`Script « ${patch.title ?? script.title} » mis à jour (${Object.keys(patch).length - 1} champ(s)).`);
    }

    case "publier_script": {
      const script = await findOwnScript(admin, ownerId, str(args.script, 200));
      if (!script) return text("Script introuvable dans ton Studio. Utilise mes_scripts pour voir les identifiants.");
      // Même geste que « Publié » dans le Studio (publishScript, studio/actions.ts).
      const { data: linked } = await admin.from("social_posts").select("id, extra").eq("script_id", script.id);
      for (const p of (linked ?? []) as { id: string; extra: Record<string, unknown> | null }[]) {
        await admin.from("social_posts").update({ extra: { ...(p.extra ?? {}), script: { title: script.title, hook: script.hook, pillar: script.pillar } } }).eq("id", p.id);
      }
      await admin.from("content_published_log").insert({ coach_id: ownerId, title: script.title, hook: script.hook, pillar: script.pillar, platform: script.platform, source_reference: script.source_reference });
      const { error } = await admin.from("coach_scripts").delete().eq("id", script.id).eq("coach_id", ownerId);
      if (error) return text("Publication impossible, réessaie.");
      return text(`« ${script.title} » marqué publié : il sort du Studio et reste dans l'historique des contenus publiés.`);
    }

    case "lister_guides": {
      const limit = Math.round(numArg(args.nombre, 1, 50) ?? 15);
      const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
      if (args.mes_guides === true) {
        const mine = (await getCoachLeadMagnets(ownerId)).slice(0, limit);
        return text(mine.length ? mine.map((g) => `- ${g.keyword} · ${g.title}${g.published ? "" : " (brouillon)"} · ${base}/ressources/${g.slug}`).join("\n") : "Tu n'as pas encore écrit de guide.");
      }
      const query = str(args.recherche, 100);
      const { items, total } = await searchLeadMagnets({ query: query || undefined, limit });
      if (!items.length) return text(query ? `Aucun guide ne correspond à « ${query} ».` : "Aucun guide publié.");
      return text([`${total} guide(s)${query ? ` pour « ${query} »` : ""}, les ${items.length} premiers :`, ...items.map((g) => `- ${g.keyword} · ${g.title} · ${base}/ressources/${g.slug}`)].join("\n"));
    }

    case "resume_business": {
      const days = Math.round(numArg(args.jours, 7, 365) ?? 30);
      const since = shift(today, -days);
      const { data: clients } = await admin.from("profiles").select("id, email, subscription_status, start_date").eq("coach_id", ownerId).eq("role", "client").neq("id", ownerId).limit(1000);
      // Comptes démo et de test exclus des chiffres (lib/internal-accounts.ts).
      const list = ((clients ?? []) as { id: string; email: string | null; subscription_status: string | null; start_date: string | null }[]).filter(isRealAccount);
      const [checks, finance, calls, accounts, scripts, published] = await Promise.all([
        list.length ? admin.from("check_ins").select("id", { count: "exact", head: true }).is("coach_replied_at", null).gte("week_start", shift(today, -21)).in("client_id", list.map((c) => c.id)) : Promise.resolve({ count: 0 }),
        admin.from("coach_finance_entries").select("kind, amount").eq("coach_id", ownerId).gte("entry_date", since),
        admin.from("sales_calls").select("show_up, closed, revenue_amount").eq("coach_id", ownerId).gte("call_date", since),
        admin.from("social_accounts").select("id").eq("owner_id", ownerId).eq("active", true),
        admin.from("coach_scripts").select("status").eq("coach_id", ownerId).limit(1000),
        admin.from("content_published_log").select("id", { count: "exact", head: true }).eq("coach_id", ownerId).gte("published_at", `${since}T00:00:00Z`),
      ]);
      const lines = [`Résumé business des ${days} derniers jours`];
      const paying = list.filter((c) => c.subscription_status === "active").length;
      const fresh = list.filter((c) => c.start_date && c.start_date.slice(0, 10) >= since).length;
      lines.push(`Clients : ${paying} payant(s) sur ${list.length} suivi(s), ${fresh} nouveau(x) sur la période. Bilans hebdo à traiter : ${checks.count ?? 0}.`);
      const fin = (finance.data ?? []) as { kind: string; amount: number }[];
      if (fin.length) {
        const rev = fin.filter((f) => f.kind === "revenu").reduce((s, f) => s + Number(f.amount || 0), 0);
        const dep = fin.filter((f) => f.kind === "depense").reduce((s, f) => s + Number(f.amount || 0), 0);
        lines.push(`Revenus notés : ${fr(rev, 2)} €, dépenses : ${fr(dep, 2)} €, solde : ${fr(rev - dep, 2)} €.`);
      } else lines.push("Revenus et dépenses : rien de noté sur la période (Business > Revenus & dépenses).");
      const cl = (calls.data ?? []) as { show_up: boolean | null; closed: boolean | null; revenue_amount: number | null }[];
      if (cl.length) {
        const shown = cl.filter((c) => c.show_up === true).length;
        const closed = cl.filter((c) => c.closed === true).length;
        const ca = cl.reduce((s, c) => s + Number(c.revenue_amount ?? 0), 0);
        lines.push(`Appels de vente : ${cl.length} prévu(s), ${shown} présent(s), ${closed} closé(s), ${fr(ca, 2)} € signés.`);
      }
      const ids = ((accounts.data ?? []) as { id: string }[]).map((a) => a.id);
      if (ids.length) {
        const { data: snaps } = await admin.from("social_account_daily").select("account_id, date, followers_total").in("account_id", ids).gte("date", shift(since, -1)).order("date");
        const per = new Map<string, number[]>();
        for (const s of (snaps ?? []) as { account_id: string; followers_total: number | null }[]) if (s.followers_total != null) per.set(s.account_id, [...(per.get(s.account_id) ?? []), Number(s.followers_total)]);
        const now = [...per.values()].reduce((s, v) => s + v[v.length - 1], 0);
        const then = [...per.values()].reduce((s, v) => s + v[0], 0);
        if (per.size) lines.push(`Abonnés réseaux : ${fr(now)} (${now - then >= 0 ? "+" : ""}${fr(now - then)} sur la période).`);
      }
      const sc = (scripts.data ?? []) as { status: string }[];
      lines.push(`Contenus : ${sc.filter((s) => s.status === "a_tourner").length} script(s) à tourner, ${sc.filter((s) => s.status === "tourne").length} tourné(s) à publier, ${published.count ?? 0} publié(s) sur la période.`);
      return text(lines.join("\n"));
    }

    case "mon_agenda": {
      const date = isDate(args.date) ? args.date : today;
      const { data } = await admin.from("schedule_blocks").select("day_of_week, specific_date, skipped_dates, start_time, end_time, label, notes, tasks, notify").eq("owner_id", ownerId).order("start_time");
      const blocks = ((data ?? []) as { day_of_week: number; specific_date: string | null; skipped_dates?: string[] | null; start_time: string; end_time: string; label: string; notes: string | null; tasks: string[] | null; notify: boolean }[])
        .filter((b) => isBlockOnDate(b, date, isoDowOf(date)));
      if (!blocks.length) return text(`Rien dans ton agenda le ${DAYS[isoDowOf(date)]} ${date}.`);
      return text([`Agenda du ${DAYS[isoDowOf(date)]} ${date}`, ...blocks.map((b) => `- ${b.start_time.slice(0, 5)} à ${b.end_time.slice(0, 5)} : ${b.label}${b.notify ? " (rappel)" : ""}${b.tasks?.length ? `, à faire : ${b.tasks.join(", ")}` : ""}${b.notes ? `. ${b.notes.replace(/\s+/g, " ").slice(0, 160)}` : ""}`)].join("\n"));
    }

    case "ajouter_bloc_agenda": {
      const label = str(args.titre, 200);
      if (!label) return text("Titre obligatoire.");
      if (!isTime(args.debut) || !isTime(args.fin)) return text("Heures au format HH:MM (ex. 07:30).");
      const start = `${(args.debut as string).trim()}:00`;
      const end = `${(args.fin as string).trim()}:00`;
      if (end <= start) return text("L'heure de fin doit être après l'heure de début.");
      if (await limited(`mcp-agenda:${ownerId}`, PRESETS.write.limit, PRESETS.write.windowSeconds)) return text("Trop d'ajouts d'un coup, réessaie dans un instant.");
      const notes = str(args.notes, 2000) || null;
      const notify = args.rappel === true;
      let rows: Record<string, unknown>[];
      if (isDate(args.date)) {
        if (args.date < today || args.date > shift(today, 366)) return text("Date hors limites : d'aujourd'hui à un an maximum.");
        const dow = isoDowOf(args.date);
        rows = [{ owner_id: ownerId, day_of_week: dow, specific_date: args.date, start_time: start, end_time: end, label, notes, tasks: [], notify, last_notified_at: args.date === today && isBlockTimeAlreadyPastToday(dow, start) ? new Date().toISOString() : null }];
      } else {
        const days = [...new Set((Array.isArray(args.jours) ? args.jours : []).map((d) => Math.round(Number(d))).filter((d) => d >= 1 && d <= 7))];
        if (!days.length) return text("Donne une date (bloc ponctuel) ou des jours de 1 à 7 (bloc chaque semaine).");
        rows = days.map((dow) => ({ owner_id: ownerId, day_of_week: dow, start_time: start, end_time: end, label, notes, tasks: [], notify, last_notified_at: isBlockTimeAlreadyPastToday(dow, start) ? new Date().toISOString() : null }));
      }
      const { error } = await admin.from("schedule_blocks").insert(rows);
      if (error) return text("Ajout impossible, réessaie.");
      return text(isDate(args.date)
        ? `Bloc « ${label} » ajouté le ${args.date} de ${start.slice(0, 5)} à ${end.slice(0, 5)}${notify ? ", avec rappel" : ""}.`
        : `Bloc « ${label} » ajouté chaque ${rows.map((r) => DAYS[r.day_of_week as number]).join(", ")} de ${start.slice(0, 5)} à ${end.slice(0, 5)}${notify ? ", avec rappel" : ""}.`);
    }

    case "ma_seance_du_jour": {
      const date = isDate(args.date) ? args.date : today;
      const prog = await activeProgram(admin, ownerId);
      if (!prog || !prog.days.length) return text("Pas de programme actif dans EP Coaching pour l'instant.");
      const dow = isoDowOf(date);
      const day = prog.days.find((d) => d.weekday === dow);
      const { data: sessions } = await admin.from("sessions").select("id, day_label, is_completed").eq("client_id", ownerId).eq("session_date", date);
      const ss = (sessions ?? []) as { id: string; day_label: string | null; is_completed: boolean }[];
      if (!day) {
        return text([
          `Programme « ${prog.name} » : aucune séance placée le ${DAYS[dow]}${ss.length ? `, mais une séance notée ce jour-là : ${ss.map((s) => s.day_label).join(", ")}` : " (jour de repos ou jour libre)"}.`,
          `Séances du programme : ${prog.days.map((d) => `${d.day_label}${d.weekday ? ` (${DAYS[d.weekday]})` : ""}`).join(", ")}.`,
        ].join("\n"));
      }
      const { data: ex } = await admin.from("exercises").select("*").eq("day_id", day.id).order("position");
      const lines = [`${DAYS[dow]} ${date} : ${day.day_label} (programme « ${prog.name} »)`];
      if (day.notes) lines.push(`Consigne : ${day.notes}`);
      for (const e of (ex ?? []) as ExerciseRow[]) {
        lines.push(`- ${e.name} : ${e.sets ?? "?"} × ${e.reps ?? "?"}${e.rir != null ? `, RIR ${e.rir}` : ""}${e.rest_seconds ? `, repos ${Math.round(e.rest_seconds / 60 * 10) / 10} min` : ""}${e.tempo ? `, tempo ${e.tempo}` : ""}${e.notes ? ` (${e.notes.replace(/\s+/g, " ").slice(0, 120)})` : ""}`);
      }
      const done = ss.find((s) => s.day_label === day.day_label) ?? ss[0];
      if (done) {
        const { data: sets } = await admin.from("session_sets").select("exercise_name, set_number, weight_kg, reps_actual").eq("session_id", done.id).order("created_at");
        const rows = (sets ?? []) as { exercise_name: string; set_number: number; weight_kg: number | null; reps_actual: number | null }[];
        lines.push(`Séance ${done.is_completed ? "terminée" : "en cours"} : ${rows.length ? rows.map((r) => `${r.exercise_name} série ${r.set_number} ${fr(Number(r.weight_kg ?? 0), 1)} kg × ${r.reps_actual ?? "?"}`).join(", ") : "aucune série notée"}.`);
      } else lines.push("Pas encore commencée.");
      return text(lines.join("\n"));
    }

    case "ma_diete_du_jour": {
      const date = isDate(args.date) ? args.date : today;
      const plan = await getActivePlan(admin, ownerId);
      const items = planItemsFor(plan, date);
      const { data: logs } = await admin.from("food_logs").select("meal_slot, calories, proteins, carbs, fats").eq("client_id", ownerId).eq("logged_at", date);
      const eaten = ((logs ?? []) as { calories: number | null; proteins: number | null; carbs: number | null; fats: number | null }[]).reduce((a, r) => ({ k: a.k + Number(r.calories ?? 0), p: a.p + Number(r.proteins ?? 0), g: a.g + Number(r.carbs ?? 0), l: a.l + Number(r.fats ?? 0) }), { k: 0, p: 0, g: 0, l: 0 });
      if (!items.length) return text(`Pas de plan nutrition actif pour le ${date}.${eaten.k ? ` Déjà noté : ${fr(eaten.k)} kcal, ${fr(eaten.p)} g de protéines.` : ""}`);
      const macro = (i: (typeof items)[number]) => ({ k: (i.food.calories_per_100 * i.grams) / 100, p: (i.food.proteins_per_100 * i.grams) / 100, g: (i.food.carbs_per_100 * i.grams) / 100, l: (i.food.fats_per_100 * i.grams) / 100 });
      const tot = items.reduce((a, i) => { const m = macro(i); return { k: a.k + m.k, p: a.p + m.p, g: a.g + m.g, l: a.l + m.l }; }, { k: 0, p: 0, g: 0, l: 0 });
      const lines = [`Diète du ${DAYS[isoDowOf(date)]} ${date}${plan?.name ? ` (plan « ${plan.name} »)` : ""} : ${fr(tot.k)} kcal, ${fr(tot.p)} g protéines, ${fr(tot.g)} g glucides, ${fr(tot.l)} g lipides`];
      for (const s of MEAL_SLOTS) {
        const its = items.filter((i) => i.slot === s.key);
        if (its.length) lines.push(`- ${slotLabel(s.key)} : ${its.map((i) => `${i.food.name} ${fr(i.grams)} g`).join(", ")} (${fr(its.reduce((a, i) => a + macro(i).k, 0))} kcal)`);
      }
      lines.push(eaten.k ? `Déjà mangé : ${fr(eaten.k)} kcal, ${fr(eaten.p)} g protéines, ${fr(eaten.g)} g glucides, ${fr(eaten.l)} g lipides.` : "Rien de noté pour l'instant.");
      return text(lines.join("\n"));
    }

    case "enregistrer_serie": {
      const exercise = str(args.exercice, 200);
      const weight = numArg(args.charge_kg, 0, 1000);
      const reps = numArg(args.reps, 0, 1000);
      const rir = args.rir === undefined ? null : numArg(args.rir, 0, 10);
      if (!exercise || weight === null || reps === null) return text("Exercice, charge (kg) et répétitions obligatoires.");
      if (args.rir !== undefined && rir === null) return text("Le RIR doit être entre 0 et 10.");
      if (await limited(`session-sets:${ownerId}`, 600, 600)) return text("Trop de séries enregistrées d'un coup, réessaie dans un instant.");
      const prog = await activeProgram(admin, ownerId);
      const { isoDow } = nowInParis();
      const wanted = str(args.seance, 100);
      const byName = wanted && prog ? prog.days.map((d) => ({ d, s: fuzzyScore(d.day_label, wanted) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s)[0]?.d : undefined;
      const plannedDay = byName ?? prog?.days.find((d) => d.weekday === isoDow);
      // Séance du jour déjà ouverte (même règle que l'appli : on reprend au
      // lieu d'en créer une deuxième), sinon on la démarre.
      let q = admin.from("sessions").select("id, day_label").eq("client_id", ownerId).eq("session_date", today).eq("is_completed", false).order("created_at", { ascending: false }).limit(1);
      if (plannedDay) q = q.eq("day_label", plannedDay.day_label);
      const { data: open } = await q.maybeSingle();
      let sessionId = (open as { id: string } | null)?.id ?? null;
      let dayLabel = (open as { day_label: string } | null)?.day_label ?? plannedDay?.day_label ?? "Séance libre";
      if (!sessionId) {
        const { data: created, error } = await admin.from("sessions").insert({ client_id: ownerId, program_id: prog?.id ?? null, day_label: dayLabel, session_date: today, is_completed: false, warmup_validated: false }).select("id").single();
        if (error || !created) return text("Impossible de démarrer la séance, réessaie.");
        sessionId = (created as { id: string }).id;
        dayLabel = plannedDay?.day_label ?? dayLabel;
      }
      let setNumber = args.numero_serie === undefined ? null : numArg(args.numero_serie, 1, 50);
      if (setNumber === null) {
        const { count } = await admin.from("session_sets").select("id", { count: "exact", head: true }).eq("session_id", sessionId).eq("exercise_name", exercise);
        setNumber = (count ?? 0) + 1;
      }
      const row = { session_id: sessionId, exercise_name: exercise, set_number: Math.round(setNumber), weight_kg: Math.round(weight * 100) / 100, reps_actual: Math.round(reps), rir_actual: rir === null ? null : Math.round(rir) };
      const { data: existing } = await admin.from("session_sets").select("id").eq("session_id", sessionId).eq("exercise_name", exercise).eq("set_number", row.set_number).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { error } = existing
        ? await admin.from("session_sets").update(row).eq("id", (existing as { id: string }).id).eq("session_id", sessionId)
        : await admin.from("session_sets").insert(row);
      if (error) return text("Enregistrement impossible, réessaie.");
      return text(`${exercise}, série ${row.set_number} : ${fr(row.weight_kg, 1)} kg × ${row.reps_actual}${row.rir_actual != null ? ` (RIR ${row.rir_actual})` : ""}, notée dans « ${dayLabel} ». Termine la séance dans l'appli pour qu'elle compte dans ton carnet et tes records.`);
    }

    case "mes_progres": {
      const weeks = Math.round(numArg(args.semaines, 2, 26) ?? 8);
      const since = shift(today, -weeks * 7);
      const [{ data: logs }, { data: sessions }, { data: prs }, { data: foods }] = await Promise.all([
        admin.from("daily_logs").select("log_date, weight_morning, steps, sleep_hours").eq("client_id", ownerId).gte("log_date", since).order("log_date"),
        admin.from("sessions").select("session_date").eq("client_id", ownerId).eq("is_completed", true).gte("session_date", since),
        admin.from("personal_records").select("exercise_name, weight_kg, reps, achieved_at").eq("client_id", ownerId).gte("achieved_at", since).order("achieved_at", { ascending: false }).limit(20),
        admin.from("food_logs").select("logged_at").eq("client_id", ownerId).gte("logged_at", since).limit(5000),
      ]);
      const L = (logs ?? []) as { log_date: string; weight_morning: number | null; steps: number | null; sleep_hours: number | null }[];
      const lines = [`Tes progrès sur ${weeks} semaines`];
      const weekKey = (d: string) => shift(d, -(isoDowOf(d) - 1));
      const byWeek = new Map<string, number[]>();
      for (const l of L) if (l.weight_morning != null) byWeek.set(weekKey(l.log_date), [...(byWeek.get(weekKey(l.log_date)) ?? []), Number(l.weight_morning)]);
      if (byWeek.size) {
        const avgs = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([w, v]) => ({ w, a: v.reduce((s, x) => s + x, 0) / v.length }));
        lines.push(`Poids moyen par semaine : ${avgs.map((x) => `${x.w} ${fr(x.a, 1)} kg`).join(", ")}.`);
        if (avgs.length >= 2) {
          const diff = avgs[avgs.length - 1].a - avgs[0].a;
          lines.push(`Évolution : ${diff >= 0 ? "+" : ""}${fr(diff, 1)} kg.`);
        }
      } else lines.push("Poids : pas de pesée notée sur la période.");
      const sess = (sessions ?? []) as { session_date: string }[];
      lines.push(`Séances terminées : ${sess.length} (${fr(sess.length / weeks, 1)} par semaine).`);
      const steps = L.filter((l) => l.steps != null).map((l) => Number(l.steps));
      const sleep = L.filter((l) => l.sleep_hours != null).map((l) => Number(l.sleep_hours));
      if (steps.length) lines.push(`Pas moyens : ${fr(steps.reduce((s, x) => s + x, 0) / steps.length)} par jour.`);
      if (sleep.length) lines.push(`Sommeil moyen : ${fr(sleep.reduce((s, x) => s + x, 0) / sleep.length, 1)} h.`);
      const foodDays = new Set(((foods ?? []) as { logged_at: string }[]).map((f) => f.logged_at)).size;
      lines.push(`Nutrition notée ${foodDays} jour(s) sur ${weeks * 7}.`);
      const P = (prs ?? []) as { exercise_name: string; weight_kg: number; reps: number | null; achieved_at: string }[];
      lines.push(P.length ? `Records battus : ${P.map((p) => `${p.exercise_name} ${fr(Number(p.weight_kg), 1)} kg${p.reps ? ` × ${p.reps}` : ""} (${p.achieved_at})`).join(", ")}.` : "Pas de nouveau record sur la période.");
      return text(lines.join("\n"));
    }
  }
  return null;
}
