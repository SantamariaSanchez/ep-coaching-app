"use server";

import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import type { ScheduleBlock } from "@/utils/agenda";

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
  const { data: row, error } = await supabase
    .from("schedule_blocks")
    .insert({ owner_id: guard.userId, ...data })
    .select()
    .single();

  if (error || !row) return { error: error?.message ?? "Erreur." };

  revalidateAgendaPaths();
  return { block: row as ScheduleBlock };
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
  const { data: rows, error } = await supabase
    .from("schedule_blocks")
    .insert(
      uniqueDays.map((day_of_week) => ({
        owner_id: guard.userId,
        day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        label: data.label,
        color: data.color,
        icon: data.icon,
        notes: data.notes,
      }))
    )
    .select();

  if (error || !rows) return { error: error?.message ?? "Erreur." };

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
  const { error } = await supabase
    .from("schedule_blocks")
    .update(data)
    .eq("id", blockId)
    .eq("owner_id", guard.userId);

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
  const { data: source, error: fetchError } = await supabase
    .from("schedule_blocks")
    .select("start_time, end_time, label, color, icon, notes")
    .eq("owner_id", guard.userId)
    .eq("day_of_week", fromDay);

  if (fetchError) return { error: fetchError.message };
  if (!source || source.length === 0) return { error: "Ce jour n'a aucun bloc à copier." };

  const toInsert = targets.flatMap((day_of_week) =>
    source.map((b) => ({ owner_id: guard.userId, day_of_week, ...b }))
  );

  const { data: rows, error } = await supabase.from("schedule_blocks").insert(toInsert).select();
  if (error || !rows) return { error: error?.message ?? "Erreur." };

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
