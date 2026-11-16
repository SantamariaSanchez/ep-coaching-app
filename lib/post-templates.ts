// Modèles de structure pour écrire un post soi-même (2026-11-16, Studio
// pensé pour un coach qui n'utilise pas d'IA). Un modèle = des lignes à
// remplacer, jamais un texte tout fait : chaque ligne dit ce qu'on y met.
// Fichier pur, client et serveur.

export interface PostTemplate {
  id: string;
  label: string;
  /** Pour quoi l'utiliser, en une ligne. */
  hint: string;
  platforms: string[];
  /** Squelette inséré dans l'éditeur. Les [crochets] sont à remplacer. */
  skeleton: string;
}

export const POST_TEMPLATES: PostTemplate[] = [
  {
    id: "scene",
    label: "Scène vécue",
    hint: "Une situation que ta cible reconnaît, puis la leçon.",
    platforms: ["linkedin", "threads"],
    skeleton: "[La scène en une phrase : où, quand, ce qui se passe]\n\n[2 lignes de détail concret]\n\n[Le vrai problème, en une phrase]\n\n[Ce qu'il faut faire à la place, en 3 lignes courtes]\n\n[La nuance : quand ça ne s'applique pas]\n\n[Une question facile pour finir]",
  },
  {
    id: "idee_recue",
    label: "Idée reçue",
    hint: "Une croyance répandue, pourquoi elle est fausse, quoi faire.",
    platforms: ["linkedin", "threads"],
    skeleton: "« [L'idée reçue, telle qu'on l'entend] »\n\n[Pourquoi tout le monde y croit, en 1 ligne]\n\n[Ce qui se passe vraiment, en 2 lignes]\n\n[Ce que tu conseilles à la place]\n\n[Une phrase à retenir]",
  },
  {
    id: "liste",
    label: "3 choses",
    hint: "Trois actions concrètes sur un seul sujet.",
    platforms: ["linkedin"],
    skeleton: "[Le problème en une phrase]\n\n[Action 1, une ligne]\n\n[Action 2, une ligne]\n\n[Action 3, une ligne]\n\n[La plus importante des trois, et pourquoi]",
  },
  {
    id: "coulisses",
    label: "Coulisses",
    hint: "Ce que tu fais vraiment cette semaine, sans mise en scène.",
    platforms: ["linkedin", "threads"],
    skeleton: "[Ce que tu as fait aujourd'hui, en une phrase]\n\n[Pourquoi tu le fais comme ça]\n\n[Ce que ça t'a appris]\n\n[Ce que ta cible peut en garder]",
  },
  {
    id: "avis",
    label: "Avis tranché",
    hint: "Une position claire, courte, qui fait réagir.",
    platforms: ["threads", "linkedin"],
    skeleton: "[Ton avis en une phrase]\n\n[La raison principale]\n\n[La limite de ton avis]",
  },
];

export function templatesFor(platform: string): PostTemplate[] {
  return POST_TEMPLATES.filter((t) => t.platforms.includes(platform));
}

/** Lignes du squelette encore à remplacer (entre crochets). */
export function unfilledLines(text: string): number {
  return (text.match(/\[[^\]\n]{3,}\]/g) ?? []).length;
}

/** Titre de rangement : la 1re ligne utile, 80 caractères au plus. */
export function titleFromPost(text: string): string {
  const first = text.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
  const clean = first.replace(/^[«"]\s*|\s*[»"]$/g, "");
  return (clean.length > 80 ? `${clean.slice(0, 77).trimEnd()}...` : clean) || "Post sans titre";
}
