import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import Anthropic from "@anthropic-ai/sdk";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

// Analyse une photo de repas via Claude Vision et retourne une estimation
// des macros. Réponse JSON : { name, calories, proteins, carbs, fats }.
// Requiert ANTHROPIC_API_KEY dans les variables d'environnement Vercel.
export async function POST(request: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  // Chaque appel coûte de l'argent : quota par compte. Vingt photos par heure
  // couvrent très largement un usage normal (quelques repas par jour).
  const limited = await enforceRateLimit(
    `ai-meal-photo:${guard.userId}`,
    PRESETS.ai.limit,
    PRESETS.ai.windowSeconds,
    "Tu as analysé beaucoup de photos d'un coup. Réessaie dans un moment."
  );
  if (limited) return limited;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Clé ANTHROPIC_API_KEY manquante dans les variables d'environnement." },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Fichier image requis." }, { status: 400 });
    }

    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image trop volumineuse (5 Mo max)." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Tu es un nutritionniste expert. Analyse cette photo de repas et estime les macronutriments POUR LA TOTALITÉ de ce qui est visible dans l'assiette/le plat.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication :
{"name":"<nom court du repas en français>","calories":<entier>,"proteins":<entier>,"carbs":<entier>,"fats":<entier>}

Règles :
- "name" : 2-4 mots maximum, en français, décrivant le repas
- "calories" : kcal totaux estimés (entier)
- "proteins" : grammes de protéines (entier)
- "carbs" : grammes de glucides (entier)
- "fats" : grammes de lipides (entier)
- Si tu ne vois pas de nourriture : {"name":"Repas non identifié","calories":0,"proteins":0,"carbs":0,"fats":0}`,
            },
          ],
        },
      ],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();

    let result: { name: string; calories: number; proteins: number; carbs: number; fats: number };
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/\{[^}]+\}/);
      if (!match) throw new Error("Réponse IA invalide");
      result = JSON.parse(match[0]);
    }

    if (typeof result.calories !== "number") throw new Error("Format invalide");

    return NextResponse.json(result);
  } catch (e) {
    console.error("analyze-meal-photo error:", e);
    return NextResponse.json(
      { error: "Impossible d'analyser la photo. Réessaie." },
      { status: 500 }
    );
  }
}
