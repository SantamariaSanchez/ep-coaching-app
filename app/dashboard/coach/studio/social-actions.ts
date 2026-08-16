"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requireCoach } from "@/lib/auth-guards";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { getLeadMagnet } from "@/lib/lead-magnets";

export interface SocialSlide {
  title: string;
  body: string;
}

export interface SocialPack {
  slides: SocialSlide[];
  instagramCaption: string;
  linkedinPost: string;
  claudePrompt: string;
}

// Générateur de contenu réseaux sociaux à partir d'un lead magnet existant
// (demande explicite 2026-08-16 : le vrai goulot d'étranglement business
// est la visibilité Insta, pas la conversion — cet outil réduit la
// friction pour poster régulièrement en réutilisant du contenu déjà
// produit plutôt que de partir d'une page blanche à chaque fois). Même
// intégration Anthropic que app/api/ai/analyze-meal-photo/route.ts
// (ANTHROPIC_API_KEY, modèle claude-haiku-4-5) : suffisant pour de la
// réécriture structurée, pas besoin d'un modèle plus cher ici.
export async function generateSocialPack(slug: string): Promise<{ data?: SocialPack; error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const limited = await checkRateLimit(`social-pack:${guard.userId}`, PRESETS.ai.limit, PRESETS.ai.windowSeconds);
  if (!limited.allowed) {
    return { error: "Trop de générations d'un coup, réessaie dans un instant." };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Clé ANTHROPIC_API_KEY manquante dans les variables d'environnement." };
  }

  const magnet = await getLeadMagnet(slug);
  if (!magnet || magnet.format !== "guide") {
    return { error: "Contenu introuvable ou format non supporté (guides uniquement)." };
  }

  const sectionsText = magnet.sections
    .map((s, i) => {
      const callout = s.callout ? `\nÀ retenir : ${s.callout}` : "";
      return `Section ${i + 1} : ${s.heading}\n${s.paragraphs.join("\n")}${callout}`;
    })
    .join("\n\n");

  const prompt = `Tu es le community manager d'EP Coaching, coaching bodybuilding et nutrition en ligne. Identité de marque : direct, concret, orienté action, jamais putaclic, jamais de superlatif vide ("incroyable", "révolutionnaire").

À partir de ce guide déjà publié, crée un pack de contenu réseaux sociaux prêt à publier.

TITRE : ${magnet.title}
ACCROCHE : ${magnet.hook}
INTRO : ${magnet.intro}

${sectionsText}

CONCLUSION : ${magnet.conclusion}

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour :
{
  "slides": [
    {"title": "<accroche du carrousel, 6-10 mots, percutante>", "body": ""},
    {"title": "<idée clé 1, 4-8 mots>", "body": "<1-2 phrases qui l'expliquent>"},
    {"title": "<idée clé 2, 4-8 mots>", "body": "<1-2 phrases qui l'expliquent>"},
    {"title": "<idée clé 3, 4-8 mots>", "body": "<1-2 phrases qui l'expliquent>"},
    {"title": "<CTA final, 4-8 mots>", "body": "<invite à télécharger le guide complet ou rejoindre EP Coaching>"}
  ],
  "instagramCaption": "<légende Instagram complète, sauts de ligne \\n, ton direct, termine par une question ou un CTA, puis 5 à 8 hashtags pertinents>",
  "linkedinPost": "<post LinkedIn plus posé, sauts de ligne \\n, hook en première ligne, 3 à 5 paragraphes courts ou puces, CTA final, sans hashtags>",
  "claudePrompt": "<prompt en français, réutilisable, que le coach peut coller ailleurs dans Claude pour générer une variante visuelle différente à partir des mêmes points clés : décris le sujet, les points à garder, le ton de marque, le format souhaité>"
}

Règles : français uniquement, jamais de tiret em/en (—) nulle part (virgule ou point à la place), entre 4 et 7 slides au total en comptant le hook et le CTA.`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();
    let parsed: SocialPack;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]+\}/);
      if (!match) throw new Error("Réponse IA invalide");
      parsed = JSON.parse(match[0]);
    }

    if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      throw new Error("Format invalide");
    }

    return { data: parsed };
  } catch (e) {
    console.error("generateSocialPack error:", e);
    return { error: "Impossible de générer le contenu, réessaie." };
  }
}
