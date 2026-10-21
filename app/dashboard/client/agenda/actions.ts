"use server";

import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { getAgendaSettings, type ScheduleBlock } from "@/utils/agenda";
import { isBlockTimeAlreadyPastToday } from "@/lib/schedule-time";
import { isBlockOnDate } from "@/lib/agenda-day";
import {
  blockKind,
  mealSlotOf,
  overlaps,
  placeAll,
  sanitizePrefs,
  sanitizeTemplateBlock,
  sanitizeTemplates,
  sanitizeWindow,
  toCalendar,
  type AgendaPrefs,
  type DayTemplate,
  type TemplateBlock,
} from "@/lib/agenda-engine";

// Chacun (client ou coach pour lui-même) gère uniquement son propre agenda —
// pas de paramètre clientId, l'utilisateur connecté est toujours le
// propriétaire du bloc. Le coach consulte l'agenda d'un client en lecture
// seule ailleurs (fiche client), jamais via ces actions.
//
// Client admin (bypass RLS) plutôt que le client serveur classique — la
// table a RLS désactivée en théorie, mais mieux vaut ne pas dépendre de cet
// état pour une simple insertion, comme partout ailleurs dans l'app où le
// serveur écrit des données pour le compte de l'utilisateur.

interface BlockData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string;
  color: string;
  icon: string | null;
  notes: string | null;
  tasks: string[];
  notify: boolean;
  /** Lien séance / repas / trajet (migration 20261020), optionnel. */
  link_ref?: string | null;
  /** Renseigné = bloc ponctuel (rendez-vous, imprévu) valable ce jour-là seulement. */
  specific_date?: string | null;
}

// ── Colonne link_ref (migration 20261020) ──────────────────────────────────
// Le code doit tourner que la migration soit passée ou non (elle s'exécute à
// la main dans le SQL Editor) : si la colonne n'existe pas encore, on
// réessaie sans elle, le bloc est enregistré sans son lien (déduit alors du
// nom et de l'icône, voir lib/agenda-engine.ts).
function isUnknownColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return /does not exist|could not find the .* column/i.test(error.message ?? "");
}

function withoutLink<T extends Record<string, unknown>>(row: T): Omit<T, "link_ref"> {
  const copy = { ...row };
  delete copy.link_ref;
  return copy;
}

type Admin = ReturnType<typeof createAdminClient>;

async function insertRows(supabase: Admin, rows: Record<string, unknown>[]): Promise<{ data: ScheduleBlock[] | null; error: string | null }> {
  if (rows.length === 0) return { data: [], error: null };
  let res = await supabase.from("schedule_blocks").insert(rows).select();
  if (isUnknownColumnError(res.error)) res = await supabase.from("schedule_blocks").insert(rows.map(withoutLink)).select();
  if (res.error || !res.data) return { data: null, error: res.error?.message ?? "Erreur." };
  return { data: res.data as ScheduleBlock[], error: null };
}

function cleanLinkRef(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanDate(v: unknown): string | null {
  return typeof v === "string" && DATE_RE.test(v) ? v : null;
}

// Un bloc dont le jour est aujourd'hui et l'heure déjà passée doit être
// marqué "déjà notifié aujourd'hui" dès sa création/modification, sinon le
// cron (toutes les 5 min, voir app/api/cron/schedule-block-notify) le trouve
// "dû" et envoie une notification parasite dans les minutes qui suivent au
// lieu d'attendre la vraie prochaine occurrence la semaine suivante. Bug réel
// remonté le 2026-08-30 ("ça m'envoie des notifs à 16h42 pour le
// pré-workout" — le bloc venait d'être créé à 16h08 pour un horaire de 14h00).
function initialLastNotifiedAt(dayOfWeek: number, startTime: string): string | null {
  return isBlockTimeAlreadyPastToday(dayOfWeek, startTime) ? new Date().toISOString() : null;
}

function revalidateAgendaPaths() {
  revalidatePath("/dashboard/client/agenda");
  revalidatePath("/dashboard/client/aujourdhui");
  revalidatePath("/dashboard/coach/moi/agenda");
}

export async function addScheduleBlock(
  data: BlockData
): Promise<{ error?: string; block?: ScheduleBlock }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { data: rows, error } = await insertRows(supabase, [
    {
      owner_id: guard.userId,
      ...data,
      link_ref: cleanLinkRef(data.link_ref),
      specific_date: cleanDate(data.specific_date),
      last_notified_at: initialLastNotifiedAt(data.day_of_week, data.start_time),
    },
  ]);

  if (error || !rows?.[0]) return { error: error ?? "Erreur." };

  revalidateAgendaPaths();
  return { block: rows[0] };
}

// Même bloc posé sur plusieurs jours d'un coup ("répéter aussi le lun/mer/ven")
// — un seul aller retour serveur au lieu d'appeler addScheduleBlock en boucle
// côté client, et une seule revalidation.
export async function addScheduleBlocksBulk(
  data: BlockData,
  days: number[]
): Promise<{ error?: string; blocks?: ScheduleBlock[] }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const uniqueDays = Array.from(new Set(days)).filter((d) => d >= 1 && d <= 7);
  if (uniqueDays.length === 0) return { error: "Aucun jour sélectionné." };

  const supabase = createAdminClient();
  const { data: rows, error } = await insertRows(
    supabase,
    uniqueDays.map((day_of_week) => ({
      owner_id: guard.userId,
      day_of_week,
      start_time: data.start_time,
      end_time: data.end_time,
      label: data.label,
      color: data.color,
      icon: data.icon,
      notes: data.notes,
      tasks: data.tasks,
      notify: data.notify,
      link_ref: cleanLinkRef(data.link_ref),
      last_notified_at: initialLastNotifiedAt(day_of_week, data.start_time),
    }))
  );

  if (error || !rows) return { error: error ?? "Erreur." };

  revalidateAgendaPaths();
  return { blocks: rows as ScheduleBlock[] };
}

export async function updateScheduleBlock(
  blockId: string,
  data: BlockData
): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {
    ...data,
    // Recalculé à chaque modification (nouveau jour/heure ou juste un
    // autre champ) : voir initialLastNotifiedAt plus haut. Idempotent et
    // sans risque de double envoi — au pire ça avance l'horodatage
    // "déjà géré aujourd'hui" sans jamais renvoyer de notif au passage.
    last_notified_at: initialLastNotifiedAt(data.day_of_week, data.start_time),
  };
  if ("link_ref" in data) patch.link_ref = cleanLinkRef(data.link_ref);
  // Ponctuel ou récurrent : fixé à la création, jamais changé par une modification.
  delete patch.specific_date;
  let { error } = await supabase.from("schedule_blocks").update(patch).eq("id", blockId).eq("owner_id", guard.userId);
  if (isUnknownColumnError(error)) {
    ({ error } = await supabase.from("schedule_blocks").update(withoutLink(patch)).eq("id", blockId).eq("owner_id", guard.userId));
  }

  if (error) return { error: error.message };

  revalidateAgendaPaths();
  return {};
}

export async function deleteScheduleBlock(blockId: string): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("schedule_blocks")
    .delete()
    .eq("id", blockId)
    .eq("owner_id", guard.userId);

  if (error) return { error: error.message };

  revalidateAgendaPaths();
  return {};
}

// Copie tous les blocs d'un jour vers un ou plusieurs autres jours — pour
// les semaines très répétitives (ex. Lundi/Mercredi/Vendredi identiques),
// évite de ressaisir chaque créneau à la main jour par jour.
export async function duplicateDayBlocks(
  fromDay: number,
  toDays: number[]
): Promise<{ error?: string; blocks?: ScheduleBlock[] }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const targets = Array.from(new Set(toDays)).filter((d) => d >= 1 && d <= 7 && d !== fromDay);
  if (targets.length === 0) return { error: "Aucun jour cible sélectionné." };

  const supabase = createAdminClient();
  // Uniquement la semaine type (pas les rendez-vous ponctuels d'une date).
  const { data: sourceRows, error: fetchError } = await supabase
    .from("schedule_blocks")
    .select("*")
    .eq("owner_id", guard.userId)
    .eq("day_of_week", fromDay)
    .is("specific_date", null);

  if (fetchError) return { error: fetchError.message };
  const source = (sourceRows ?? []) as ScheduleBlock[];
  if (source.length === 0) return { error: "Ce jour n'a aucun bloc à copier." };

  const toInsert = targets.flatMap((day_of_week) =>
    source.map((b) => ({
      owner_id: guard.userId,
      day_of_week,
      start_time: b.start_time,
      end_time: b.end_time,
      label: b.label,
      color: b.color,
      icon: b.icon,
      notes: b.notes,
      tasks: b.tasks ?? [],
      notify: b.notify,
      link_ref: b.link_ref ?? null,
      last_notified_at: initialLastNotifiedAt(day_of_week, b.start_time),
    }))
  );

  const { data: rows, error } = await insertRows(supabase, toInsert);
  if (error || !rows) return { error: error ?? "Erreur." };

  revalidateAgendaPaths();
  return { blocks: rows as ScheduleBlock[] };
}

// Supprime tous les blocs d'un jour donné — pour repartir de zéro sur une
// journée sans les supprimer un par un.
export async function clearDayBlocks(day: number): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("schedule_blocks")
    .delete()
    .eq("owner_id", guard.userId)
    .eq("day_of_week", day);

  if (error) return { error: error.message };

  revalidateAgendaPaths();
  return {};
}

// Transforme un bloc d'agenda en rappel push actif ("Rendez-vous" à 18h le
// mardi → rappel réel dans Mes rappels) — relie les deux fonctionnalités
// sans dupliquer l'infra de notification (même table, même cron déjà en
// place, voir app/api/cron/send-reminders). Client uniquement : "Mes
// rappels" n'existe pas côté coach.
export async function createReminderFromBlock(
  label: string,
  time: string,
  dayCode: string
): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reminders")
    .insert({ client_id: guard.userId, label, time, days: [dayCode] });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/client/reminders");
  return {};
}

// Tâches à cocher dans un bloc d'agenda (voir supabase/migrations/
// 20260815e_schedule_block_task_logs.sql) — le client envoie l'ensemble des
// clés cochées pour la journée (même mécanique que logSteps/completed_items
// dans components/steps/StepsClient.tsx), pas une clé à la fois : un seul
// upsert simple plutôt qu'une opération de tableau côté base.
export async function saveScheduleBlockTaskCompletion(
  date: string,
  completedKeys: string[]
): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("schedule_block_task_logs")
    .upsert(
      { owner_id: guard.userId, log_date: date, completed_keys: completedKeys, updated_at: new Date().toISOString() },
      { onConflict: "owner_id,log_date" }
    );

  if (error) {
    console.error("saveScheduleBlockTaskCompletion error:", error);
    return { error: "Erreur serveur, réessaie." };
  }

  revalidateAgendaPaths();
  return {};
}

// ── Réorganiser la journée (2026-09-30) ────────────────────────────────────
// "Si c'est le rush et que les blocs sautent, je bouge un bloc et le reste
// s'ajuste." Décale un bloc ET tous ceux qui le suivent ce jour-là.
//   scope "jour"     : aujourd'hui seulement. Les blocs récurrents sont
//                      masqués à cette date (skipped_dates) et remplacés par
//                      une copie datée décalée : la semaine type ne bouge pas.
//   scope "toujours" : la semaine type elle-même est décalée.
function toMin(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}
function toTime(min: number): string {
  const c = Math.max(0, Math.min(23 * 60 + 59, Math.round(min)));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}:00`;
}

export async function shiftDayFromBlock(input: {
  blockId: string;
  deltaMinutes: number;
  scope: "jour" | "toujours";
  /** Date concernée (YYYY-MM-DD, heure de Paris) pour le scope "jour". */
  date: string;
  /** Faux : seul ce bloc bouge, la suite de la journée reste où elle est. */
  withFollowing?: boolean;
}): Promise<{ error?: string; moved?: number }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const delta = Math.round(Number(input.deltaMinutes));
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 12 * 60) return { error: "Décalage invalide." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Date invalide." };

  const supabase = createAdminClient();
  const { data: anchor } = await supabase.from("schedule_blocks").select("*").eq("id", input.blockId).eq("owner_id", guard.userId).maybeSingle();
  if (!anchor) return { error: "Bloc introuvable." };
  const a = anchor as ScheduleBlock;

  const { data: dayRows } = await supabase.from("schedule_blocks").select("*").eq("owner_id", guard.userId).eq("day_of_week", a.day_of_week);
  const sameDay = ((dayRows ?? []) as ScheduleBlock[]).filter((b) =>
    input.scope === "toujours"
      ? !b.specific_date
      : b.specific_date ? b.specific_date === input.date : !(b.skipped_dates ?? []).includes(input.date)
  );
  const following = sameDay
    .filter((b) => (input.withFollowing === false ? b.id === a.id : b.start_time >= a.start_time))
    .sort((x, y) => x.start_time.localeCompare(y.start_time));
  if (!following.length) return { moved: 0 };

  let moved = 0;
  for (const b of following) {
    const start = toTime(toMin(b.start_time) + delta);
    const end = toTime(Math.max(toMin(b.end_time) + delta, toMin(start) + 5));
    if (input.scope === "toujours" || b.specific_date) {
      const { error } = await supabase.from("schedule_blocks").update({ start_time: start, end_time: end }).eq("id", b.id).eq("owner_id", guard.userId);
      if (!error) moved++;
      continue;
    }
    // Aujourd'hui seulement : copie datée décalée, puis le modèle récurrent
    // est masqué à cette date.
    const { data: copy, error: insErr } = await supabase.from("schedule_blocks").insert({
      owner_id: guard.userId,
      day_of_week: b.day_of_week,
      start_time: start,
      end_time: end,
      label: b.label,
      color: b.color,
      icon: b.icon,
      notes: b.notes,
      tasks: b.tasks ?? [],
      notify: b.notify,
      ...(b.link_ref ? { link_ref: b.link_ref } : {}),
      specific_date: input.date,
      last_notified_at: initialLastNotifiedAt(b.day_of_week, start),
    }).select("id").single();
    if (insErr || !copy) continue;
    const { error: skipErr } = await supabase
      .from("schedule_blocks")
      .update({ skipped_dates: [...new Set([...(b.skipped_dates ?? []), input.date])] })
      .eq("id", b.id)
      .eq("owner_id", guard.userId);
    // Modèle pas masqué : la copie est retirée, sinon le bloc apparaissait
    // deux fois ce jour-là (heure d'origine + heure décalée) et notifiait
    // deux fois.
    if (skipErr) {
      await supabase.from("schedule_blocks").delete().eq("id", copy.id).eq("owner_id", guard.userId);
      continue;
    }
    moved++;
  }
  revalidateAgendaPaths();
  revalidatePath("/dashboard/coach");
  return { moved };
}

// ── Imprévus du jour (2026-10-21) ──────────────────────────────────────────
// « Quand y a des switch, des rdv, des imprévus, que ce soit simple de
// modifier » : un bloc récurrent peut être retiré d'une date précise (« Pas
// aujourd'hui ») ou remplacé ce jour-là par un bloc ponctuel. La semaine type
// ne bouge jamais : seule la colonne skipped_dates du modèle change.

/** Retire (skip = true) ou remet (skip = false) un bloc récurrent à une date. */
export async function setBlockSkippedOnDate(blockId: string, date: string, skip: boolean): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!DATE_RE.test(date)) return { error: "Date invalide." };
  const supabase = createAdminClient();
  const { data: row } = await supabase.from("schedule_blocks").select("id, specific_date, skipped_dates").eq("id", blockId).eq("owner_id", guard.userId).maybeSingle();
  if (!row) return { error: "Bloc introuvable." };
  const b = row as Pick<ScheduleBlock, "id" | "specific_date" | "skipped_dates">;
  if (b.specific_date) return { error: "Ce bloc est déjà ponctuel : supprime-le plutôt." };
  const current = b.skipped_dates ?? [];
  const next = skip ? [...new Set([...current, date])] : current.filter((d) => d !== date);
  const { error } = await supabase.from("schedule_blocks").update({ skipped_dates: next }).eq("id", blockId).eq("owner_id", guard.userId);
  if (error) return { error: error.message };
  revalidateAgendaPaths();
  return {};
}

/**
 * « Remplacer aujourd'hui par… » : le bloc d'origine disparaît de cette date
 * (masqué s'il est récurrent, supprimé s'il était déjà ponctuel) et un bloc
 * ponctuel prend sa place. La semaine type n'est pas touchée.
 */
export async function replaceBlockOnDate(
  blockId: string,
  date: string,
  data: BlockData
): Promise<{ error?: string; block?: ScheduleBlock; removed?: boolean }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!DATE_RE.test(date)) return { error: "Date invalide." };
  const supabase = createAdminClient();
  const { data: row } = await supabase.from("schedule_blocks").select("*").eq("id", blockId).eq("owner_id", guard.userId).maybeSingle();
  if (!row) return { error: "Bloc introuvable." };
  const original = row as ScheduleBlock;

  const { data: rows, error: insErr } = await insertRows(supabase, [
    {
      owner_id: guard.userId,
      ...data,
      link_ref: cleanLinkRef(data.link_ref),
      specific_date: date,
      last_notified_at: initialLastNotifiedAt(data.day_of_week, data.start_time),
    },
  ]);
  if (insErr || !rows?.[0]) return { error: insErr ?? "Erreur." };

  const { error } = original.specific_date
    ? await supabase.from("schedule_blocks").delete().eq("id", original.id).eq("owner_id", guard.userId)
    : await supabase
        .from("schedule_blocks")
        .update({ skipped_dates: [...new Set([...(original.skipped_dates ?? []), date])] })
        .eq("id", original.id)
        .eq("owner_id", guard.userId);
  if (error) {
    // Sans ça, les deux blocs s'afficheraient (et notifieraient) ce jour-là.
    await supabase.from("schedule_blocks").delete().eq("id", rows[0].id).eq("owner_id", guard.userId);
    return { error: error.message };
  }
  revalidateAgendaPaths();
  return { block: rows[0], removed: !!original.specific_date };
}

// ── Agenda productivité (2026-10-20) ────────────────────────────────────────
// Réglages (heures de la journée), journées types, « Construire ma semaine »,
// glisser/étirer un bloc, sous-tâches. Réglages et journées types vivent dans
// user_settings (migration 20261020_agenda_reglages_et_liens.sql).

const MIGRATION_MSG = "Réglages d'agenda pas encore disponibles : la mise à jour de la base (migration du 20/10) doit être passée.";

async function upsertSettings(userId: string, patch: Record<string, unknown>): Promise<{ error?: string }> {
  const { error } = await createAdminClient()
    .from("user_settings")
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (isUnknownColumnError(error)) return { error: MIGRATION_MSG };
  if (error) {
    console.error("agenda settings upsert:", error);
    return { error: "Enregistrement impossible, réessaie." };
  }
  return {};
}

/** Heures de début et de fin de journée (minutes depuis minuit ; fin <= début = journée de nuit). */
export async function saveAgendaWindow(start: number, end: number): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const w = sanitizeWindow(start, end);
  const res = await upsertSettings(guard.userId, { agenda_day_start: w.start, agenda_day_end: w.end });
  if (!res.error) revalidateAgendaPaths();
  return res;
}

export async function saveAgendaPrefs(prefs: AgendaPrefs): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  return upsertSettings(guard.userId, { agenda_prefs: sanitizePrefs(prefs) });
}

/** Liste complète des journées types (le client gère l'ajout/la suppression). */
export async function saveDayTemplates(templates: DayTemplate[]): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const res = await upsertSettings(guard.userId, { agenda_templates: sanitizeTemplates(templates) });
  if (!res.error) revalidateAgendaPaths();
  return res;
}

/** Les heures d'un bloc (glisser / étirer dans la grille). */
export async function setScheduleBlockTimes(
  blockId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const re = /^([01]\d|2[0-3]):[0-5]\d(:00)?$|^24:00(:00)?$/;
  if (!re.test(startTime) || !re.test(endTime) || startTime.startsWith("24")) return { error: "Heure invalide." };
  if (!(dayOfWeek >= 1 && dayOfWeek <= 7)) return { error: "Jour invalide." };
  const s = startTime.slice(0, 5) + ":00";
  const e = endTime.slice(0, 5) + ":00";
  if (e <= s) return { error: "L'heure de fin doit être après l'heure de début." };
  const { error } = await createAdminClient()
    .from("schedule_blocks")
    .update({ day_of_week: dayOfWeek, start_time: s, end_time: e, last_notified_at: initialLastNotifiedAt(dayOfWeek, s) })
    .eq("id", blockId)
    .eq("owner_id", guard.userId);
  if (error) return { error: error.message };
  revalidateAgendaPaths();
  return {};
}

/** Sous-tâches d'un bloc (ajout / retrait depuis la fiche du bloc). */
export async function setScheduleBlockTasks(blockId: string, tasks: string[]): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const clean = (Array.isArray(tasks) ? tasks : []).map((t) => String(t).trim().slice(0, 300)).filter(Boolean).slice(0, 30);
  const { error } = await createAdminClient().from("schedule_blocks").update({ tasks: clean }).eq("id", blockId).eq("owner_id", guard.userId);
  if (error) return { error: error.message };
  revalidateAgendaPaths();
  return {};
}

const isAlarmLabel = (label: string) => /r[ée]veil/i.test(label);

/** Bloc à créer exprimé dans une colonne (journée de la personne) en minutes absolues. */
export interface ColumnBlockInput extends TemplateBlock {
  col: number;
}

/**
 * Pose une liste de blocs (journée type appliquée, semaine construite).
 *   mode "completer" : rien n'est supprimé, les blocs qui chevauchent un
 *                      bloc déjà là sont laissés de côté ;
 *   mode "remplacer" : la semaine type des colonnes concernées est d'abord
 *                      vidée (jamais les rendez-vous datés ni le réveil),
 *                      demandé uniquement après confirmation à l'écran.
 */
export async function placeColumnBlocks(
  input: ColumnBlockInput[],
  mode: "completer" | "remplacer"
): Promise<{ error?: string; blocks?: ScheduleBlock[]; removedIds?: string[]; skipped?: number }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!Array.isArray(input) || input.length === 0) return { error: "Rien à ajouter." };
  if (input.length > 300) return { error: "Trop de blocs d'un coup." };

  const items = input
    .map((raw) => {
      const b = sanitizeTemplateBlock(raw);
      const col = Number((raw as { col?: unknown }).col);
      return b && col >= 1 && col <= 7 ? { ...b, col } : null;
    })
    .filter((b): b is ColumnBlockInput => !!b);
  if (items.length === 0) return { error: "Blocs invalides." };

  const supabase = createAdminClient();
  const settings = await getAgendaSettings(guard.userId);
  const w = settings.window;
  const { data: current, error: readErr } = await supabase.from("schedule_blocks").select("*").eq("owner_id", guard.userId);
  if (readErr) return { error: readErr.message };
  const recurring = ((current ?? []) as ScheduleBlock[]).filter((b) => !b.specific_date && !isAlarmLabel(b.label));
  const placed = placeAll(recurring, w);
  const cols = new Set(items.map((i) => i.col));

  let removedIds: string[] = [];
  let toPlace = items;
  let skipped = 0;
  if (mode === "remplacer") {
    removedIds = placed.filter((p) => cols.has(p.col)).map((p) => p.block.id);
    if (removedIds.length) {
      const { error } = await supabase.from("schedule_blocks").delete().eq("owner_id", guard.userId).in("id", removedIds);
      if (error) return { error: error.message };
    }
  } else {
    toPlace = items.filter((i) => isAlarmLabel(i.label) || !placed.some((p) => p.col === i.col && overlaps(p, i)));
    skipped = items.length - toPlace.length;
  }

  const rows = toPlace.flatMap((i) =>
    toCalendar(i.col, i.s, i.e).map((c) => ({
      owner_id: guard.userId,
      day_of_week: c.day_of_week,
      start_time: c.start_time,
      end_time: c.end_time,
      label: i.label,
      color: i.color,
      icon: i.icon,
      notes: i.notes,
      tasks: i.tasks,
      notify: i.notify,
      link_ref: i.link_ref,
      last_notified_at: initialLastNotifiedAt(c.day_of_week, c.start_time),
    }))
  );
  const { data, error } = await insertRows(supabase, rows);
  if (error || !data) return { error: error ?? "Erreur.", removedIds };

  revalidateAgendaPaths();
  return { blocks: data, removedIds, skipped };
}

/**
 * Heures des repas posées dans l'agenda tel jour (créneau de diète -> "HH:MM"),
 * pour que la nutrition affiche le même « quand » que l'agenda. Vide si
 * aucun bloc repas ce jour-là (la nutrition garde alors ses heures habituelles).
 */
export async function getAgendaMealTimes(date: string): Promise<Record<string, string>> {
  const guard = await requireAuth();
  if (!guard.ok || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return {};
  const w = new Date(`${date}T12:00:00Z`).getUTCDay();
  const dow = w === 0 ? 7 : w;
  try {
    const { data } = await createAdminClient().from("schedule_blocks").select("*").eq("owner_id", guard.userId).eq("day_of_week", dow);
    const out: Record<string, string> = {};
    for (const b of ((data ?? []) as ScheduleBlock[]).filter((x) => isBlockOnDate(x, date, dow)).sort((a, c) => a.start_time.localeCompare(c.start_time))) {
      if (blockKind(b) !== "repas") continue;
      const slot = mealSlotOf(b);
      if (!out[slot]) out[slot] = b.start_time.slice(0, 5);
    }
    return out;
  } catch {
    return {};
  }
}
