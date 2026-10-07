// Positionnement du coach (2026-10-07), sur le modèle du Notion du
// fondateur : une niche précise, un résultat promis, un avatar client
// détaillé avec ses propres mots, une offre, une différence. Tout est
// rempli dans l'appli puis réutilisé partout : bio, phrase de
// positionnement, piliers de contenu, et par Claude (connecteur EP Coaching)
// pour écrire des scripts et créer la page Notion du coach.
// Fichier pur, importable côté client comme serveur.

export interface Positioning {
  niche: string;
  nicheKey: string;
  result: string;
  timeframe: string;
  mechanism: string;
  avatarName: string;
  avatarAge: string;
  avatarSituation: string;
  pains: string;
  desires: string;
  objections: string;
  tried: string;
  words: string;
  where: string;
  offerName: string;
  offerFormat: string;
  offerPrice: string;
  offerIncludes: string;
  difference: string;
  proof: string;
  enemy: string;
  pillars: string;
}

export const EMPTY_POSITIONING: Positioning = {
  niche: "", nicheKey: "", result: "", timeframe: "", mechanism: "",
  avatarName: "", avatarAge: "", avatarSituation: "", pains: "", desires: "", objections: "", tried: "", words: "", where: "",
  offerName: "", offerFormat: "", offerPrice: "", offerIncludes: "",
  difference: "", proof: "", enemy: "", pillars: "",
};

export const POSITIONING_KEYS = Object.keys(EMPTY_POSITIONING) as (keyof Positioning)[];

export function cleanPositioning(raw: unknown): Positioning {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...EMPTY_POSITIONING };
  for (const k of POSITIONING_KEYS) {
    const v = src[k];
    if (typeof v === "string") out[k] = v.slice(0, 2000);
  }
  return out;
}

/** Exemple concret par niche : sert de modèle à remplir, jamais de réponse imposée. */
export interface NichePreset {
  key: string;
  label: string;
  example: Partial<Positioning>;
}

export const NICHE_PRESETS: NichePreset[] = [
  {
    key: "perte_gras",
    label: "Perte de gras",
    example: {
      niche: "Perte de gras pour les salariés de 30 à 45 ans qui n'ont pas le temps",
      result: "Perdre 6 à 10 kg de gras sans régime extrême ni 2 h de sport par jour",
      timeframe: "12 semaines",
      mechanism: "3 séances de 45 min, un plan alimentaire avec leurs plats habituels, 8 000 pas par jour",
      avatarName: "Julien",
      avatarAge: "37 ans, cadre, 2 enfants",
      avatarSituation: "A pris 12 kg depuis la naissance de ses enfants, mange au bureau, rentre tard",
      pains: "Il ne rentre plus dans ses pantalons, il est essoufflé avec ses enfants, il a honte à la plage",
      desires: "Retrouver un ventre plat, avoir de l'énergie le soir, être un exemple pour ses enfants",
      objections: "Je n'ai pas le temps, j'ai déjà essayé, je ne veux pas peser mes aliments à vie",
      tried: "Jeûne intermittent, application de calories, abonnement salle jamais utilisé",
      words: "« j'ai pris du bide », « je n'ai pas le temps », « je craque le soir »",
      where: "Instagram et LinkedIn le soir, podcasts dans la voiture",
      pillars: "Repas rapides du quotidien, mythes du régime, avant/après de clients, organisation de la semaine",
    },
  },
  {
    key: "musculation",
    label: "Prise de muscle",
    example: {
      niche: "Prise de muscle pour les hommes de 18 à 30 ans qui stagnent malgré la salle",
      result: "Prendre 4 à 6 kg de muscle visible sur la bonne balance poids/gras",
      timeframe: "6 mois",
      mechanism: "Programme en volume progressif, suivi des charges à chaque séance, nutrition en léger surplus",
      avatarName: "Yanis",
      avatarAge: "22 ans, étudiant",
      avatarSituation: "Va à la salle depuis 2 ans, suit des programmes trouvés sur YouTube, ne voit plus de progrès",
      pains: "Il se trouve trop fin, ses charges ne bougent plus, il compare son physique aux autres",
      desires: "Des épaules larges, des bras qui remplissent le t-shirt, être pris au sérieux à la salle",
      objections: "Je peux le faire seul, c'est trop cher, je suis ectomorphe",
      tried: "Programmes PPL gratuits, gainer, changement de programme toutes les 3 semaines",
      words: "« je stagne », « je n'arrive pas à prendre », « je veux du volume »",
      where: "TikTok, Instagram, YouTube musculation",
      pillars: "Technique des exercices, erreurs de débutant, progression de clients, nutrition de prise de masse",
    },
  },
  {
    key: "bodybuilding_compet",
    label: "Bodybuilding de compétition",
    example: {
      niche: "Préparation à la compétition de bodybuilding natural, première prépa",
      result: "Monter sur scène sec, plein et confiant, avec un posing maîtrisé",
      timeframe: "16 à 24 semaines de prépa",
      mechanism: "Sèche progressive suivie chaque semaine, posing hebdo en vidéo, peak week planifiée",
      avatarName: "Thomas",
      avatarAge: "26 ans, s'entraîne depuis 5 ans",
      avatarSituation: "Veut faire sa première compétition natural mais ne sait pas par où commencer",
      pains: "Peur de rater sa sèche, de perdre du muscle, de ne pas savoir poser",
      desires: "Monter sur scène, se prouver qu'il peut le faire, viser une place",
      objections: "Je ne suis pas encore assez gros, je peux le faire avec un coach gratuit sur internet",
      tried: "Mini-sèches seul, terminées trop tôt ou trop vite",
      words: "« prépa », « peak week », « être sec », « posing »",
      where: "Instagram, YouTube de prépas, forums de fédérations",
      pillars: "Journal de prépa, posing, peak week, nutrition de sèche, mental en fin de prépa",
    },
  },
  {
    key: "enhanced",
    label: "Athlètes enhanced (suivi santé)",
    example: {
      niche: "Suivi santé et entraînement des athlètes enhanced qui veulent limiter les risques",
      result: "Progresser en gardant des bilans sanguins et une tension sous contrôle",
      timeframe: "Suivi continu, bilan tous les 3 mois",
      mechanism: "Prises de sang régulières lues avec un médecin, tension suivie chaque semaine, entraînement et nutrition adaptés",
      avatarName: "Karim",
      avatarAge: "31 ans, compétiteur",
      avatarSituation: "Utilise déjà des produits, n'a aucun suivi médical, a peur pour son cœur et ses reins",
      pains: "Tension qui monte, bilans jamais faits, peur des effets à long terme",
      desires: "Continuer à progresser sans se détruire la santé",
      objections: "Les médecins vont me juger, je sais ce que je fais",
      tried: "Conseils de forums, aucun suivi",
      words: "« bilan sanguin », « tension », « récupération »",
      where: "Groupes privés, Instagram",
      enemy: "Les coachs qui donnent des protocoles sans aucun suivi santé",
      pillars: "Lire ses bilans, tension et cardio, récupération, réduction des risques (jamais de protocole de produits)",
    },
  },
  {
    key: "force",
    label: "Force et powerlifting",
    example: {
      niche: "Powerlifting pour les pratiquants qui veulent leur premier total en compétition",
      result: "Ajouter 50 à 80 kg au total et réussir 9 essais sur 9 le jour J",
      timeframe: "16 semaines",
      mechanism: "Blocs de force avec RPE, technique filmée chaque semaine, choix des essais calculé",
      avatarName: "Sarah",
      avatarAge: "28 ans",
      avatarSituation: "Fait du squat, du développé couché et du soulevé de terre depuis 1 an, veut tester une compétition",
      pains: "Douleurs au dos en soulevé de terre, stagnation au développé couché",
      desires: "Un gros total, un premier podium, se sentir forte",
      objections: "Je ne suis pas assez forte pour une compétition",
      tried: "Programmes 5x5, sans périodisation",
      words: "« total », « 1RM », « RPE », « PR »",
      where: "Instagram, YouTube powerlifting",
      pillars: "Technique des 3 mouvements, programmation, jour de compétition, progression des athlètes",
    },
  },
  {
    key: "course",
    label: "Course à pied",
    example: {
      niche: "Course à pied pour les débutants qui veulent finir leur premier semi-marathon",
      result: "Finir un semi-marathon sans blessure et sans marcher",
      timeframe: "14 semaines",
      mechanism: "3 sorties par semaine en zones d'allure, renforcement 2 fois par semaine, montée de volume maîtrisée",
      avatarName: "Claire",
      avatarAge: "34 ans",
      avatarSituation: "Court 5 km de temps en temps, s'est inscrite à un semi avec des amis",
      pains: "Peur de se blesser, douleur aux genoux, ne sait pas à quelle allure courir",
      desires: "Passer la ligne d'arrivée, être fière d'elle",
      objections: "Je peux suivre un plan gratuit sur une appli",
      tried: "Plans gratuits abandonnés après une douleur",
      words: "« allure », « fractionné », « sortie longue »",
      where: "Strava, Instagram, groupes de course",
      pillars: "Allures et zones, renforcement du coureur, nutrition de course, récits de premières courses",
    },
  },
  {
    key: "hyrox",
    label: "Hyrox",
    example: {
      niche: "Préparation Hyrox pour les pratiquants de salle qui veulent leur première course",
      result: "Finir sa première Hyrox en moins de 1 h 30",
      timeframe: "12 semaines",
      mechanism: "Course + stations travaillées ensemble, simulations chronométrées, stratégie de roxzone",
      avatarName: "Mehdi",
      avatarAge: "30 ans",
      avatarSituation: "Fait de la musculation, court peu, inscrit à sa première Hyrox",
      pains: "Cardio faible, peur d'exploser aux fentes et au wall ball",
      desires: "Un bon chrono, faire la course en double avec un ami",
      objections: "Je vais juste courir plus",
      tried: "Courir un peu en plus de la muscu",
      words: "« stations », « roxzone », « sled »",
      where: "Instagram, communautés Hyrox",
      pillars: "Stations expliquées, simulations, stratégie de course, nutrition le jour J",
    },
  },
  {
    key: "crossfit",
    label: "CrossFit",
    example: {
      niche: "CrossFit pour les pratiquants qui veulent passer au niveau RX",
      result: "Faire les WOD en RX et ses premiers muscle-ups",
      timeframe: "6 mois",
      mechanism: "Force, gymnastique et haltérophilie programmées en parallèle des WOD",
      avatarName: "Lucas",
      avatarAge: "29 ans",
      avatarSituation: "En box depuis 18 mois, fait les WOD en scaled",
      pains: "Bloqué en gymnastique, mauvaise technique en haltéro",
      desires: "Faire RX, réussir les Open",
      objections: "La box me suffit",
      tried: "Seulement les WOD de la box",
      words: "« RX », « scaled », « benchmark », « Open »",
      where: "Instagram, box",
      pillars: "Gymnastique, haltérophilie, benchmarks, mobilité",
    },
  },
  {
    key: "reeducation",
    label: "Rééducation et reprise après blessure",
    example: {
      niche: "Reprise du sport après une blessure au dos, au genou ou à l'épaule",
      result: "Revenir à son sport sans douleur et sans rechute",
      timeframe: "8 à 12 semaines",
      mechanism: "Échelle de douleur suivie à chaque séance, charge remontée progressivement, en lien avec le kiné",
      avatarName: "Nadia",
      avatarAge: "41 ans",
      avatarSituation: "Lombalgie depuis 6 mois, a arrêté la salle",
      pains: "Peur que la douleur revienne, perte de forme, frustration",
      desires: "Reprendre sans peur, retrouver sa forme d'avant",
      objections: "Mon kiné suffit, j'ai peur de me refaire mal",
      tried: "Repos complet, séances de kiné sans suite",
      words: "« j'ai peur de me refaire mal », « reprendre »",
      where: "Facebook, Instagram, bouche à oreille",
      pillars: "Comprendre la douleur, exercices de reprise, témoignages, travail avec les kinés",
    },
  },
  {
    key: "femmes",
    label: "Femmes (cycle, grossesse, post-partum)",
    example: {
      niche: "Remise en forme des mamans après la grossesse",
      result: "Retrouver un ventre tonique et de l'énergie sans abîmer son périnée",
      timeframe: "16 semaines",
      mechanism: "Reprise progressive validée par la sage-femme, séances courtes à la maison, entraînement selon le cycle",
      avatarName: "Émilie",
      avatarAge: "33 ans, bébé de 6 mois",
      avatarSituation: "Fatiguée, ne se reconnaît plus, peu de temps",
      pains: "Ventre relâché, fuites urinaires, manque de temps et de sommeil",
      desires: "Se sentir bien dans son corps, avoir de l'énergie pour son enfant",
      objections: "Ce n'est pas le moment, je n'ai pas le temps",
      tried: "Vidéos YouTube trop intenses",
      words: "« diastasis », « périnée », « reprendre »",
      where: "Instagram, groupes de mamans",
      pillars: "Périnée et abdos, séances courtes, alimentation de maman, témoignages",
    },
  },
  {
    key: "seniors",
    label: "Seniors et santé",
    example: {
      niche: "Rester autonome et fort après 60 ans",
      result: "Monter les escaliers sans effort, réduire le risque de chute",
      timeframe: "12 semaines",
      mechanism: "2 séances de force adaptées, équilibre et mobilité chaque jour",
      avatarName: "Michel",
      avatarAge: "67 ans, retraité",
      avatarSituation: "A perdu en force, peur de tomber",
      pains: "Fatigue, douleurs articulaires, perte d'autonomie",
      desires: "Jouer avec ses petits-enfants, voyager",
      objections: "À mon âge c'est trop tard, j'ai peur de me blesser",
      tried: "Marche, aquagym",
      words: "« rester en forme », « mes articulations »",
      where: "Facebook, bouche à oreille, médecin",
      pillars: "Force après 60 ans, équilibre, histoires de clients, santé des os",
    },
  },
  {
    key: "prepa",
    label: "Préparation physique",
    example: {
      niche: "Préparation physique des footballeurs amateurs",
      result: "Être plus rapide, plus explosif et moins blessé sur la saison",
      timeframe: "Une intersaison (8 semaines)",
      mechanism: "Force, vitesse et prévention des blessures calées sur le calendrier des matchs",
      avatarName: "Enzo",
      avatarAge: "19 ans, joueur de R1",
      avatarSituation: "Veut passer au niveau supérieur, se blesse souvent",
      pains: "Ischios fragiles, manque d'explosivité",
      desires: "Être titulaire, être repéré",
      objections: "Le club fait déjà la prépa",
      tried: "La prépa collective du club",
      words: "« explosivité », « ischios », « reprise »",
      where: "Instagram, TikTok foot",
      pillars: "Vitesse, prévention des blessures, force pour le sport, routines d'avant-match",
    },
  },
];

/** Phrase de positionnement en une ligne. */
export function oneLiner(p: Positioning): string {
  // « Perte de gras pour les salariés pressés » : on garde la personne.
  const raw = p.niche.trim();
  const idx = raw.toLowerCase().indexOf(" pour ");
  const base = idx > 0 ? raw.slice(idx + 6).trim() : raw;
  const who = /^(les|des|la|le|l'|l’|un|une|mes|ces|tous|toutes|ceux|celles)/i.test(base) ? base : `les ${base}`;
  const result = p.result.trim();
  if (!who || !result) return "";
  const time = p.timeframe.trim() ? ` en ${p.timeframe.trim()}` : "";
  const how = p.mechanism.trim() ? ` grâce à ${lowerFirst(p.mechanism.trim())}` : "";
  return `J'aide ${lowerFirst(who)} à ${lowerFirst(result)}${time}${how}.`;
}

/** Bio courte pour Instagram, TikTok ou LinkedIn. */
export function bioLines(p: Positioning): string[] {
  const lines: string[] = [];
  if (p.niche.trim()) lines.push(cap(p.niche.trim()));
  if (p.result.trim()) lines.push(`${cap(p.result.trim())}${p.timeframe.trim() ? ` en ${p.timeframe.trim()}` : ""}`);
  if (p.proof.trim()) lines.push(cap(p.proof.trim()));
  if (p.offerName.trim()) lines.push(`${cap(p.offerName.trim())} : lien ci-dessous`);
  return lines.slice(0, 4);
}

export function pillarList(p: Positioning): string[] {
  return p.pillars.split(/[,\n;]/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
}

/** Taux de remplissage, pour montrer ce qui manque. */
export function completion(p: Positioning): number {
  const keys: (keyof Positioning)[] = ["niche", "result", "timeframe", "mechanism", "avatarSituation", "pains", "desires", "objections", "words", "offerName", "offerPrice", "difference", "pillars"];
  return Math.round((keys.filter((k) => p[k].trim()).length / keys.length) * 100);
}

/** Fiche complète en texte (export Notion, copie, ou lecture par Claude). */
export function positioningMarkdown(p: Positioning): string {
  const sec = (title: string, rows: [string, string][]) => {
    const filled = rows.filter(([, v]) => v.trim());
    return filled.length ? `## ${title}\n${filled.map(([k, v]) => `- **${k}** : ${v.trim()}`).join("\n")}\n` : "";
  };
  const line = oneLiner(p);
  return [
    `# Mon positionnement`,
    line ? `> ${line}\n` : "",
    sec("Niche et promesse", [["Niche", p.niche], ["Résultat promis", p.result], ["Délai", p.timeframe], ["Méthode", p.mechanism]]),
    sec("Avatar client", [["Prénom", p.avatarName], ["Profil", p.avatarAge], ["Situation", p.avatarSituation], ["Douleurs", p.pains], ["Désirs", p.desires], ["Objections", p.objections], ["Déjà essayé", p.tried], ["Ses mots", p.words], ["Où le trouver", p.where]]),
    sec("Offre", [["Nom", p.offerName], ["Format", p.offerFormat], ["Prix", p.offerPrice], ["Contenu", p.offerIncludes]]),
    sec("Différence", [["Ce qui me rend différent", p.difference], ["Preuves", p.proof], ["Ce contre quoi je me bats", p.enemy]]),
    sec("Contenu", [["Piliers", p.pillars]]),
  ].filter(Boolean).join("\n");
}

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
