import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth-guards";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { ALL_EQUIPMENT, sanitizeEquipment } from "@/lib/gym-equipment";

// Suggère les équipements visibles sur une photo de machine ou de salle, à
// partir du catalogue de lib/gym-equipment.ts. Ce n'est qu'une suggestion :
// l'utilisateur coche ou décoche lui-même. Sans ANTHROPIC_API_KEY, 503 et
// l'écran retombe sur le cochage manuel.
export async function POST(request: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });
  const limited = await enforceRateLimit(`ai-gym-photo:${guard.userId}`, PRESETS.ai.limit, PRESETS.ai.windowSeconds, "Beaucoup de photos d'un coup. Réessaie dans un moment.");
  if (limited) return limited;
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Suggestion automatique indisponible : coche le matériel à la main." }, { status: 503 });

  try {
    const form = await request.formData();
    const file = form.get("photo") as File | null;
    if (!file || !file.type.startsWith("image/")) return NextResponse.json({ error: "Image requise." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image trop lourde (5 Mo max)." }, { status: 400 });
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const catalogue = ALL_EQUIPMENT.map((i) => `${i.key}: ${i.label}`).join("\n");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            {
              type: "text",
              text: `Voici une photo d'une salle de sport. Liste uniquement les équipements du catalogue ci-dessous qui sont clairement visibles.\n\nCatalogue (clé: libellé) :\n${catalogue}\n\nRéponds UNIQUEMENT avec un tableau JSON de clés, sans explication. Si tu hésites sur un équipement, ne le mets pas. Exemple : ["leg_press","cable_station"]`,
            },
          ],
        },
      ],
    });
    const text = (message.content[0] as { type: string; text: string }).text.trim();
    const match = text.match(/\[[^\]]*\]/);
    const keys = sanitizeEquipment(match ? JSON.parse(match[0]) : []);
    return NextResponse.json({ equipment: keys });
  } catch (e) {
    console.error("analyze-gym-photo error:", e);
    return NextResponse.json({ error: "Analyse impossible, coche le matériel à la main." }, { status: 500 });
  }
}
