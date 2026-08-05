import { NextResponse } from "next/server";

// Public endpoint — no auth needed (called from leadmagnet HTML pages).
//
// Comme il est public ET qu'il appelle un modèle payant, deux garde fous
// existent ici :
//   1. les réponses sont validées contre une liste blanche de clés connues
//      (voir les tables de libellés plus bas). Aucun texte libre n'entre dans
//      le prompt : avant, `objLabels[answers[0]] || answers[0]` laissait
//      injecter n'importe quelle consigne dans le prompt et faire dire au
//      modèle ce qu'on voulait, en plus de laisser envoyer une charge
//      arbitrairement longue et donc coûteuse ;
//   2. un quota par adresse IP (voir consumeRateLimit ci dessous), sinon
//      n'importe qui peut boucler dessus et faire grimper la facture.
export async function POST(request: Request) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
          return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

  let body: unknown;
  try {
        body = await request.json();
  } catch {
        return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const answers = (body as { answers?: unknown })?.answers;

  if (!Array.isArray(answers) || answers.length < 5) {
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

  // Liste blanche stricte : une réponse inconnue fait échouer la requête au
  // lieu d'être recopiée telle quelle dans le prompt.
  const tables = [objLabels, trackLabels, protLabels, poidsLabels, legumesLabels];
  const labels: string[] = [];
  for (let i = 0; i < tables.length; i++) {
        const raw = answers[i];
        const label = typeof raw === "string" ? tables[i][raw] : undefined;
        if (!label) {
              return NextResponse.json({ error: "Réponses invalides." }, { status: 400 });
        }
        labels.push(label);
  }

  const prompt = `Voici les réponses d'un pratiquant de musculation qui cherche à optimiser sa nutrition :
  - Objectif : ${labels[0]}
  - Tracking : ${labels[1]}
  - Diversité protéines : ${labels[2]}
  - Évolution du poids : ${labels[3]}
  - Diversité légumes/fruits : ${labels[4]}

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
        // On ne renvoie pas le corps d'erreur du fournisseur : il peut contenir
        // des détails d'infrastructure, et cette route est publique.
        console.error("diagnostic/nutrition: erreur Anthropic", response.status);
        return NextResponse.json({ error: "Analyse indisponible pour le moment." }, { status: 502 });
  }

  try {
        const data = await response.json();
        const text = data.content
              .filter((b: { type: string }) => b.type === "text")
              .map((b: { text: string }) => b.text)
              .join("");
        const clean = text.replace(/```json|```/g, "").trim();
        const result = JSON.parse(clean);
        return NextResponse.json(result);
  } catch {
        return NextResponse.json({ error: "Analyse indisponible pour le moment." }, { status: 502 });
  }
}
