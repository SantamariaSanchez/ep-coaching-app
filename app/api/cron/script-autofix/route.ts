import { NextResponse } from "next/server";
import { runScriptAutofix } from "@/lib/script-autofix";

// Correction automatique des scripts du Studio qui sortent du vocabulaire
// (mots bannis, « lien en bio », étude citée, compte Instagram mal écrit...).
// Le fondateur ne veut pas de bouton à cliquer : les scripts écrits par les
// routines ou à la main sont remis dans son vocabulaire tout seuls, quelques
// uns à chaque passage (pg_cron toutes les 10 minutes), l'ancienne version
// gardée dans previous_version.
export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ skipped: "no-ai" });
  const result = await runScriptAutofix(3);
  return NextResponse.json(result);
}
