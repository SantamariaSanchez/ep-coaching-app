import type { LiveExercise } from "@/lib/live-session";
import { inferLoadMode, isBodyweightMode, skillFor, type StrengthExtra } from "@/lib/training-styles";
import type { SetState } from "./types";

// Détail « force / calisthenics » d'une série à enregistrer dans
// session_sets.details : poids du corps, lest, assistance, étape de skill,
// RPE, tentative de compétition. Null quand la série est une série de charge
// classique sans rien de spécial (le bodybuilding ne change pas).
function toNum(v: string | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function loadModeOf(ex: Pick<LiveExercise, "name">, set: Pick<SetState, "mode">) {
  return set.mode ?? inferLoadMode(ex.name);
}

export function setExtra(ex: LiveExercise, set: SetState): StrengthExtra | null {
  const mode = loadModeOf(ex, set);
  const out: StrengthExtra = {};
  if (isBodyweightMode(mode)) out.mode = mode as StrengthExtra["mode"];
  if (mode === "assistance") out.assist_kg = toNum(set.assistKg);
  if (skillFor(ex.name) && set.step) out.step = set.step;
  const rpe = toNum(set.rpe);
  if (rpe != null) out.rpe = rpe;
  if (ex.technique === "attempts" && set.made != null) out.made = set.made;
  return Object.keys(out).length > 0 ? out : null;
}
