import { getAppSetup } from "@/lib/app-setup-server";
import { hiddenSegments } from "@/lib/app-setup";
import { getMemberPreferences } from "@/utils/member-preferences";
import { derivePersona, type Persona } from "@/lib/persona";
import { availableIntents } from "@/lib/intents";
import { getIntentHints } from "@/lib/intents-server";
import { getT } from "@/lib/i18n-server";
import type { LauncherIntent } from "@/components/home/IntentLauncher";

/** Tout ce qu'il faut au lanceur « Je veux... » de l'accueil. */
export async function loadLauncher(userId: string, space: "coach" | "client", opts: { isWoman?: boolean } = {}): Promise<{ intents: LauncherIntent[]; focus: string[]; hints: Record<string, string>; persona: Persona }> {
  const [setup, prefs, t] = await Promise.all([getAppSetup(userId), getMemberPreferences(userId), getT()]);
  const persona = derivePersona({ role: space, setup, prefs, isWoman: opts.isWoman });
  const hidden = hiddenSegments(setup, space);
  const list = availableIntents(space, hidden).map((i) => ({
    id: i.id,
    label: i.label,
    icon: i.icon,
    keywords: i.keywords,
    href: i.id === "comprendre" && persona.learn ? `${i.href[space]}/${persona.learn}` : (i.href[space] as string),
  }));
  // Les réponses ne sont calculées que pour ce qui a une chance d'être vu
  // (priorités du profil + tout ce qui est fréquent par nature).
  const ids = [...new Set([...persona.focus, "agenda", "manger", "seance", "bilan"])].filter((id) => list.some((i) => i.id === id));
  const hints = await getIntentHints(userId, space, ids, t);
  return { intents: list, focus: persona.focus, hints, persona };
}

/** Version sans les réponses : juste la liste (bouton « tout » de l'accueil). */
export async function loadLauncherLite(userId: string, space: "coach" | "client"): Promise<{ intents: LauncherIntent[]; focus: string[]; hints: Record<string, string>; persona: Persona }> {
  const [setup, prefs] = await Promise.all([getAppSetup(userId), getMemberPreferences(userId)]);
  const persona = derivePersona({ role: space, setup, prefs });
  const hidden = hiddenSegments(setup, space);
  const intents = availableIntents(space, hidden).map((i) => ({
    id: i.id,
    label: i.label,
    icon: i.icon,
    keywords: i.keywords,
    href: i.id === "comprendre" && persona.learn ? `${i.href[space]}/${persona.learn}` : (i.href[space] as string),
  }));
  return { intents, focus: persona.focus, hints: {}, persona };
}
