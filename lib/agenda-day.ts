// Un bloc d'agenda est-il présent tel jour ? (fichier sans import serveur,
// utilisable partout). Bloc récurrent : son jour de semaine, sauf les dates
// où il a été remplacé par une copie décalée (skipped_dates, migration
// 20260930d). Bloc ponctuel : uniquement sa date.
export function isBlockOnDate(
  block: { day_of_week: number; specific_date?: string | null; skipped_dates?: string[] | null },
  date: string,
  dow: number
): boolean {
  if (block.day_of_week !== dow) return false;
  if (block.specific_date) return block.specific_date === date;
  return !(block.skipped_dates ?? []).includes(date);
}
