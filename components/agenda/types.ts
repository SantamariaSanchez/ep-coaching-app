import type { ScheduleBlock } from "@/utils/agenda";
import type { AgendaPrefs, DayTemplate, DayWindow, TemplateBlock } from "@/lib/agenda-engine";

export interface BlockFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string;
  color: string;
  icon: string | null;
  notes: string | null;
  tasks: string[];
  notify: boolean;
  link_ref?: string | null;
  /** Renseigné = bloc ponctuel (ce jour-là seulement), la semaine type ne change pas. */
  specific_date?: string | null;
}

export interface ColumnBlockInput extends TemplateBlock {
  col: number;
}

export type PlaceResult = { error?: string; blocks?: ScheduleBlock[]; removedIds?: string[]; skipped?: number };

/** Actions serveur de l'agenda (toutes optionnelles : la fiche client côté coach est en lecture seule). */
export interface AgendaActions {
  addScheduleBlock?: (data: BlockFormData) => Promise<{ error?: string; block?: ScheduleBlock }>;
  addScheduleBlocksBulk?: (data: BlockFormData, days: number[]) => Promise<{ error?: string; blocks?: ScheduleBlock[] }>;
  updateScheduleBlock?: (blockId: string, data: BlockFormData) => Promise<{ error?: string }>;
  deleteScheduleBlock?: (blockId: string) => Promise<{ error?: string }>;
  duplicateDayBlocks?: (fromDay: number, toDays: number[]) => Promise<{ error?: string; blocks?: ScheduleBlock[] }>;
  clearDayBlocks?: (day: number) => Promise<{ error?: string }>;
  saveTaskCompletion?: (date: string, completedKeys: string[]) => Promise<{ error?: string }>;
  shiftDayFromBlock?: (input: { blockId: string; deltaMinutes: number; scope: "jour" | "toujours"; date: string; withFollowing?: boolean }) => Promise<{ error?: string; moved?: number }>;
  setBlockSkippedOnDate?: (blockId: string, date: string, skip: boolean) => Promise<{ error?: string }>;
  replaceBlockOnDate?: (blockId: string, date: string, data: BlockFormData) => Promise<{ error?: string; block?: ScheduleBlock; removed?: boolean }>;
  saveAgendaWindow?: (start: number, end: number) => Promise<{ error?: string }>;
  saveAgendaPrefs?: (prefs: AgendaPrefs) => Promise<{ error?: string }>;
  saveDayTemplates?: (templates: DayTemplate[]) => Promise<{ error?: string }>;
  setScheduleBlockTimes?: (blockId: string, dayOfWeek: number, startTime: string, endTime: string) => Promise<{ error?: string }>;
  setScheduleBlockTasks?: (blockId: string, tasks: string[]) => Promise<{ error?: string }>;
  placeColumnBlocks?: (input: ColumnBlockInput[], mode: "completer" | "remplacer") => Promise<PlaceResult>;
}

export interface AgendaSettingsProp {
  window: DayWindow;
  prefs: AgendaPrefs;
  templates: DayTemplate[];
  ready: boolean;
}
