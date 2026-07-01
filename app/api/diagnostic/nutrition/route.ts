import { NextResponse } from "next/server";

// Public endpoint — no auth needed (called from leadmagnet HTML pages)
export async function POST(request: Request) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
          return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

  const body = await request.json();
    const { answers } = body;

  if (!answers || answers.length < 5) {
        return NextResponse.json({ error: "Missing answers" }, { status: 400 });
  }

  const objLabels: Record<string, string> = {
        prise: "prise de masse",
        seche: "sèche",
        recomp: "recomposition",
        maint: "maintien",
  };
    const trackLabels: Record<string, string> = {
          jamais: "ne trace jamais ses calories",
          parfois: "trace parfois ses calories",
          souvent: "trace souvent ses calories",
          toujours: "trace toujours ses calories",
    };
    const protLabels: Record<string, string> = {
          "1-2": "1 à 2 sources de protéines différentes par semaine",
          "3-4": "3 à 4 sources de protéines différentes",
          "5+": "5 sources ou plus",
    };
    const poidsLabels: Record<string, string> = {
          monte_vite: "monte rapidement (plus de 0,6 kg/semaine)",
          monte_lent: "monte doucement (0,2 à 0,5 kg/semaine)",
          stable: "est stable depuis longtemps",
          descend: "descend",
    };
    const legumesLabels: Record<string, string> = {
          peu: "moins de 5 variétés de légumes/fruits par semaine",
          moyen: "5 à 10 variétés",
          bon: "plus de 10 variétés",
    };

  const prompt = `Voici les réponses d'un pratiquant de musculation qui cherche à optimiser sa nutrition :
  - Objectif : ${objLabels[answers[0]] || answers[0]}
  - Tracking : ${trackLabels[answers[1]] || answers[1]}
  - Diversité protéines : ${protLabels[answers[2]] || answers[2]}
  - Évolution du poids : ${poidsLabels[answers[3]] || answers[3]}
  - Diversité légumes/fruits : ${legumesLabels[answers[4]] || answers[4]}

  Calcule un score nutritionnel entre 20 et 92 en appliquant ces règles STRICTES :

  Score de base = 60

  Ajustements OBLIGATOIRES selon les réponses :
  - Tracking "jamais" → -20 pts (OBLIGATOIRE)
  - Tracking "parfois" → -10 pts
  - Tracking "toujours" → +15 pts
  - Objectif "sèche" + poids "monte rapidement" → -15 pts supplémentaires (surplus non contrôlé)
  - Objectif "prise de masse" + poids "descend" → -15 pts (déficit en masse)
  - Objectif "prise de masse" + poids "monte rapidement" → -5 pts (surplus trop fort)
  - Protéines "1-2 sources" → -15 pts
  - Protéines "5+ sources" → +10 pts
  - Légumes "moins de 5" → -15 pts
  - Légumes "plus de 10" → +10 pts
  - Tracking "toujours" + poids trajectoire correcte + protéines "3-4 ou 5+" + légumes "moyen ou bon" → +10 pts bonus

  RÈGLE ABSOLUE : deux profils différents = deux scores obligatoirement différents (minimum 10 pts d'écart).
  Le score doit refléter EXACTEMENT les réponses données, pas un score générique.

  Réponds UNIQUEMENT en JSON valide :
  {
    "score": (nombre entier entre 20 et 92),
      "titre": "(3-6 mots, spécifique à CE profil)",
        "intro": "(2-3 phrases DIRECTEMENT liées aux réponses données, tutoiement, cash)",
          "problemes": ["(problème 1 issu directement des réponses)", "(problème 2)", "(problème 3 si pertinent)"],
            "priorites": ["(action 1 ultra concrète pour CE cas)", "(action 2)", "(action 3)"]
            }
            Pas de markdown. Juste le JSON.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
                model: "claude-haiku-4-5",
                max_tokens: 800,
                system: "Tu es un coach nutrition expert. Tu analyses les réponses EXACTES et tu calcules un score basé sur des règles strictes. Tu varies obligatoirement tes résultats selon les profils.",
                messages: [{ role: "user", content: prompt }],
        }),
  });

  if (!response.ok) {
        const err = await response.text();
        return NextResponse.json({ error: "Anthropic error", detail: err }, { status: 500 });
  }

  const data = await response.json();
    const text = data.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

  return NextResponse.json(result);
}
