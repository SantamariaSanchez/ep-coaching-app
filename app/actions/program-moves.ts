"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";
import { isBlockTimeAlreadyPastToday } from "@/lib/schedule-time";
import { addDaysIso, isoWeekday, pickSessionBlock, weekStartOf } from "@/lib/program-week";
import { applyWeekMoves, isValidWeekday } from "@/lib/program-moves";
import type { ScheduleBlock } from "@/utils/agenda";

// « Je décale ma séance » : changer le jour d'une séance du programme, soit
// juste cette semaine, soit à chaque semaine, avec échange si le jour visé
// porte déjà une séance. L'agenda suit (le bloc « Séance : X » est déplacé
// avec la même mécanique que replaceBlockOnDate : bloc récurrent masqué à la
// date + copie ponctuelle), l'accueil et le programme lisent le jour effectif
// via getActiveProgram.

type Admin = ReturnType<typeof createAdminClient>;
type Scope = "week" | "always";
interface DayRow {
  id: string;
  program_id: string;
  day_label: string;
  weekday: number | null;
}

function revalidateAll() {
  for (const p of [
    "/dashboard/client/program",
    "/dashboard/client/aujourdhui",
    "/dashboard/client/agenda",
    "/dashboard/client",
    "/dashboard/coach/moi/programme",
    "/dashboard/coach/moi/agenda",
    "/dashboard/coach",
  ]) revalidatePath(p);
}

/** Déplace le bloc d'agenda d'une séance de `from` à `to` (dates de la semaine concernée). */
async function moveBlock(admin: Admin, owner: string, block: ScheduleBlock | null, from: string, to: string, siblings: ScheduleBlock[]) {
  if (!block || from === to) return;
  const toDow = isoWeekday(to);
  const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (block.specific_date) {
    // Déjà une copie ponctuelle : si on revient sur le jour du modèle (récurrent
    // masqué à cette date), on le remet et on retire la copie.
    const model = siblings.find(
      (b) => !b.specific_date && b.id !== block.id && norm(b.label) === norm(block.label) && b.day_of_week === toDow && (b.skipped_dates ?? []).includes(to)
    );
    if (model) {
      await admin.from("schedule_blocks").update({ skipped_dates: (model.skipped_dates ?? []).filter((d) => d !== to) }).eq("id", model.id).eq("owner_id", owner);
      await admin.from("schedule_blocks").delete().eq("id", block.id).eq("owner_id", owner);
    } else {
      await admin.from("schedule_blocks").update({ specific_date: to, day_of_week: toDow }).eq("id", block.id).eq("owner_id", owner);
    }
    return;
  }
  const copy = {
    owner_id: owner,
    day_of_week: toDow,
    start_time: block.start_time,
    end_time: block.end_time,
    label: block.label,
    color: block.color,
    icon: block.icon,
    notes: block.notes,
    tasks: block.tasks ?? [],
    notify: block.notify,
    specific_date: to,
    last_notified_at: isBlockTimeAlreadyPastToday(toDow, block.start_time) ? new Date().toISOString() : null,
    ...(block.link_ref ? { link_ref: block.link_ref } : {}),
  };
  let ins = await admin.from("schedule_blocks").insert(copy).select("id").single();
  if (ins.error && /link_ref/.test(ins.error.message)) {
    const rest = { ...copy } as Record<string, unknown>;
    delete rest.link_ref;
    ins = await admin.from("schedule_blocks").insert(rest).select("id").single();
  }
  if (ins.error || !ins.data) return;
  const { error } = await admin
    .from("schedule_blocks")
    .update({ skipped_dates: [...new Set([...(block.skipped_dates ?? []), from])] })
    .eq("id", block.id)
    .eq("owner_id", owner);
  if (error) await admin.from("schedule_blocks").delete().eq("id", ins.data.id).eq("owner_id", owner);
}

/** Déplace le bloc récurrent d'une séance sur un autre jour de la semaine type. */
async function moveRecurringBlock(admin: Admin, owner: string, block: ScheduleBlock | null, toDow: number | null) {
  if (!block || block.specific_date || !toDow || block.day_of_week === toDow) return;
  await admin
    .from("schedule_blocks")
    .update({
      day_of_week: toDow,
      ...(isBlockTimeAlreadyPastToday(toDow, block.start_time) ? { last_notified_at: new Date().toISOString() } : {}),
    })
    .eq("id", block.id)
    .eq("owner_id", owner);
}

export async function moveProgramDay(input: {
  dayId: string;
  weekday: number;
  scope: Scope;
  /** Si le jour visé porte déjà une séance : l'échanger (vrai) ou refuser (faux). */
  swap?: boolean;
}): Promise<{ error?: string; swappedWith?: string | null }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!isValidWeekday(input.weekday)) return { error: "Jour invalide." };
  if (input.scope !== "week" && input.scope !== "always") return { error: "Choix invalide." };

  const admin = createAdminClient();
  const { data: dayRow } = await admin.from("program_days").select("id, program_id, day_label, weekday").eq("id", input.dayId).maybeSingle();
  if (!dayRow) return { error: "Séance introuvable." };
  const mover = dayRow as DayRow;

  const { data: prog } = await admin.from("programs").select("id, client_id, is_active").eq("id", mover.program_id).maybeSingle();
  if (!prog) return { error: "Programme introuvable." };
  const clientId = (prog as { client_id: string }).client_id;
  if (clientId !== guard.userId) {
    const { data: client } = await admin.from("profiles").select("coach_id").eq("id", clientId).maybeSingle();
    if ((client as { coach_id: string | null } | null)?.coach_id !== guard.userId) return { error: "Accès refusé." };
  }

  const today = todayInParis();
  const weekStart = weekStartOf(today);
  const { data: allDays } = await admin.from("program_days").select("id, program_id, day_label, weekday").eq("program_id", mover.program_id);
  const days = (allDays as DayRow[]) ?? [];
  const { data: moveRows } = await admin.from("program_day_moves").select("day_id, weekday").eq("program_id", mover.program_id).eq("week_start", weekStart);
  const moves = (moveRows as { day_id: string; weekday: number }[]) ?? [];

  // Jour effectif de chaque séance : modèle, ou modèle + décalages de la semaine.
  const effective = new Map<string, number | null>(
    (input.scope === "week" ? applyWeekMoves(days, moves) : days).map((d) => [d.id, d.weekday])
  );
  const oldWeekday = effective.get(mover.id) ?? null;
  if (oldWeekday === input.weekday) return {};
  const occupant = days.find((d) => d.id !== mover.id && effective.get(d.id) === input.weekday) ?? null;
  if (occupant && input.swap === false) return { error: `${occupant.day_label} est déjà prévue ce jour-là.` };

  if (input.scope === "week" && input.weekday < isoWeekday(today)) return { error: "Ce jour est déjà passé cette semaine." };

  // Agenda : blocs des séances concernées, repérés avant toute modification.
  const { data: blockRows } = await admin.from("schedule_blocks").select("*").eq("owner_id", clientId);
  const blocks = (blockRows as ScheduleBlock[]) ?? [];
  const dateOf = (wd: number) => addDaysIso(weekStart, wd - 1);
  const findBlock = (d: DayRow, wd: number | null) => (wd ? pickSessionBlock(blocks, d.day_label, dateOf(wd), wd, true) : null);
  const moverBlock = findBlock(mover, oldWeekday);
  const occupantBlock = occupant ? findBlock(occupant, input.weekday) : null;

  // Nouveaux jours : le mover prend le jour visé, l'occupant (si échange) prend l'ancien jour du mover.
  const changes: { day: DayRow; from: number | null; to: number | null; block: ScheduleBlock | null }[] = [
    { day: mover, from: oldWeekday, to: input.weekday, block: moverBlock },
  ];
  if (occupant) changes.push({ day: occupant, from: input.weekday, to: oldWeekday, block: occupantBlock });

  if (input.scope === "always") {
    for (const c of changes) {
      const { error } = await admin.from("program_days").update({ weekday: c.to }).eq("id", c.day.id);
      if (error) return { error: "Impossible de décaler la séance." };
      // Un décalage ponctuel de cette semaine n'a plus de raison d'être.
      await admin.from("program_day_moves").delete().eq("day_id", c.day.id).eq("week_start", weekStart);
    }
    for (const c of changes) await moveRecurringBlock(admin, clientId, c.block, c.to);
  } else {
    for (const c of changes) {
      const base = c.day.weekday;
      const res =
        c.to == null || c.to === base
          ? await admin.from("program_day_moves").delete().eq("day_id", c.day.id).eq("week_start", weekStart)
          : await admin
              .from("program_day_moves")
              .upsert({ program_id: c.day.program_id, day_id: c.day.id, week_start: weekStart, weekday: c.to }, { onConflict: "day_id,week_start" });
      if (res.error) return { error: "Impossible de décaler la séance." };
    }
    for (const c of changes) if (c.from && c.to) await moveBlock(admin, clientId, c.block, dateOf(c.from), dateOf(c.to), blocks);
  }

  revalidateAll();
  return { swappedWith: occupant?.day_label ?? null };
}
