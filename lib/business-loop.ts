// Le circuit d'EP Coaching (règle d'Emmanuel du 26/11) : il met du contenu
// dans Notion, Claude s'en nourrit et produit, Emmanuel tourne et poste, et
// tout doit finir en abonnés, leads, appels et clientes suivies. Ce module
// lit chaque maillon avec de vrais chiffres, dit lequel bloque (le premier
// rouge dans l'ordre du circuit) et l'action qui le débloque. Il sert au
// tableau de bord du coach ET aux routines d'écriture (outil MCP
// etat_du_systeme), qui adaptent leur travail au goulot. Fichier pur, testé.

export type LoopTone = "ok" | "warn" | "bad";

export interface LoopMetrics {
  /** Vidéos (reels et YouTube) « à tourner » en stock. */
  videoStock: number;
  /** Vidéos publiées sur 7 jours (journal des publications : publier un script le retire du stock). */
  videoPublished7d: number;
  /** Vidéos tournées, pas encore publiées. */
  videoShotWaiting: number;
  /** Posts écrits (LinkedIn) prêts à publier. */
  writtenStock: number;
  /** Posts écrits publiés sur 7 jours. */
  writtenPublished7d: number;
  /** Jours depuis la dernière saisie de stats réseaux (capture dans Mes stats réseaux ; null = jamais). */
  daysSinceStatsCapture: number | null;
  /** Ouvertures des liens /g/NNN envoyés en DM, sur 7 jours. */
  guideClicks7d: number;
  /** Leads captés sur 7 jours. */
  leads7d: number;
  /** Clics vers la réservation d'audit (liens suivis), sur 7 jours. */
  auditClicks7d: number;
  /** Appels de vente notés sur 30 jours. */
  calls30d: number;
  /** Clientes actives. */
  activeClients: number;
  /** Clientes qui ont noté au moins un repas sur 7 jours. */
  clientsLoggingFood7d: number;
  /** Clientes qui ont fait au moins une séance sur 7 jours. */
  clientsTraining7d: number;
  /** Le coach lui-même : jours avec au moins un repas noté sur 7. */
  selfFoodDays7d: number;
  /** Le coach lui-même : séances notées sur 7 jours. */
  selfSessions7d: number;
}

export interface LoopStep {
  key: string;
  label: string;
  value: string;
  tone: LoopTone;
  /** Ce qu'il faut faire, quand le maillon n'est pas vert. */
  action: string | null;
  /** Qui le fait : Emmanuel ou Claude (routines et sessions). */
  owner: "emmanuel" | "claude";
}

export interface LoopReport {
  steps: LoopStep[];
  /** Premier maillon rouge du circuit (le goulot), sinon le premier orange. */
  bottleneck: LoopStep | null;
  /** Consigne aux routines d'écriture des vidéos (reels, YouTube). */
  writingMode: "ecrire" | "retravailler_le_stock";
  writingReason: string;
  /** Consigne à la routine des posts écrits (LinkedIn). */
  writtenMode: "ecrire" | "retravailler_le_stock";
}

/** Au-delà de ce stock, écrire du neuf ne sert à rien : on améliore l'existant. */
export const STOCK_CAP = 60;
/** Rythme visé : une vidéo publiée par jour. */
export const SHOOT_TARGET_7D = 7;
/** Posts écrits : au-delà de 60 prêts, on retravaille aussi l'existant. */
export const WRITTEN_STOCK_CAP = 60;

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function computeBusinessLoop(m: LoopMetrics): LoopReport {
  const steps: LoopStep[] = [];

  // Publier un script le retire du stock et l'inscrit au journal des
  // publications (outil publier_script) : c'est ce journal qui compte.
  const videoOut = m.videoPublished7d + m.videoShotWaiting;
  steps.push({
    key: "tournage",
    label: "Vidéos tournées et publiées",
    value: `${plural(m.videoPublished7d, "vidéo publiée", "vidéos publiées")} sur 7 jours, ${m.videoShotWaiting} tournée${m.videoShotWaiting > 1 ? "s" : ""} en attente, ${m.videoStock} en stock`,
    tone: videoOut >= SHOOT_TARGET_7D ? "ok" : videoOut >= 3 ? "warn" : "bad",
    action:
      videoOut >= SHOOT_TARGET_7D
        ? null
        : "Tourne au moins un reel par jour dans le Studio (mode tournage), puis publie-le. Le stock est là : il ne manque que la caméra.",
    owner: "emmanuel",
  });

  steps.push({
    key: "publication",
    label: "Posts LinkedIn",
    value: `${plural(m.writtenPublished7d, "post publié", "posts publiés")} sur 7 jours, ${m.writtenStock} prêt${m.writtenStock > 1 ? "s" : ""}`,
    tone: m.writtenPublished7d >= 5 ? "ok" : m.writtenPublished7d >= 1 ? "warn" : "bad",
    action: m.writtenPublished7d >= 5 ? null : "Publie au moins un post LinkedIn par jour depuis « Posts à publier », puis marque-le publié.",
    owner: "emmanuel",
  });

  // Plus de synchro automatique (décision d'Emmanuel du 16/11) : les stats se
  // saisissent par capture d'écran dans Mes stats réseaux. Une fois par
  // semaine suffit pour savoir ce qui marche.
  const cap = m.daysSinceStatsCapture;
  steps.push({
    key: "mesure",
    label: "Stats réseaux",
    value: cap === null ? "aucune capture saisie" : cap === 0 ? "capture saisie aujourd'hui" : `dernière capture il y a ${plural(cap, "jour", "jours")}`,
    tone: cap !== null && cap <= 7 ? "ok" : cap !== null && cap <= 14 ? "warn" : "bad",
    action:
      cap !== null && cap <= 7
        ? null
        : "Une fois par semaine, ajoute dans Mes stats réseaux la capture d'écran des stats de tes posts de la semaine. Sans ça, impossible de savoir quels reels refaire.",
    owner: "emmanuel",
  });

  steps.push({
    key: "dm",
    label: "DM et guides",
    value: `${plural(m.guideClicks7d, "guide ouvert", "guides ouverts")} depuis un DM sur 7 jours`,
    tone: m.guideClicks7d >= 5 ? "ok" : m.guideClicks7d >= 1 ? "warn" : "bad",
    action:
      m.guideClicks7d >= 5
        ? null
        : "Réponds à chaque commentaire « NNN » avec le bloc « Réponse DM » du script (Studio). C'est lui qui transforme un commentaire en lead.",
    owner: "emmanuel",
  });

  steps.push({
    key: "leads",
    label: "Leads",
    value: `${plural(m.leads7d, "lead", "leads")} sur 7 jours`,
    tone: m.leads7d >= 3 ? "ok" : m.leads7d >= 1 ? "warn" : "bad",
    action:
      m.leads7d >= 3
        ? null
        : m.guideClicks7d > 0
          ? "Des gens ouvrent les guides mais ne laissent pas leur email : Claude retravaille l'accroche des guides les plus envoyés."
          : "Les leads suivent les DM : débloque d'abord le maillon « DM et guides ».",
    owner: m.guideClicks7d > 0 ? "claude" : "emmanuel",
  });

  steps.push({
    key: "appels",
    label: "Audits et appels",
    value: `${plural(m.auditClicks7d, "clic", "clics")} vers l'audit sur 7 jours, ${plural(m.calls30d, "appel noté", "appels notés")} sur 30 jours`,
    tone: m.calls30d >= 4 ? "ok" : m.calls30d >= 1 || m.auditClicks7d >= 1 ? "warn" : "bad",
    action:
      m.calls30d >= 4
        ? null
        : "Mets le lien suivi de l'audit (/s/instagram/audit) dans ta bio et note chaque appel dans Business (appels de vente), même ceux qui ne signent pas.",
    owner: "emmanuel",
  });

  steps.push({
    key: "clientes",
    label: "Clientes",
    value: plural(m.activeClients, "cliente active", "clientes actives"),
    tone: m.activeClients >= 5 ? "ok" : m.activeClients >= 1 ? "warn" : "bad",
    action: m.activeClients >= 5 ? null : "Chaque audit se termine par l'invitation dans l'appli (60 jours gratuits), même sans coaching signé.",
    owner: "emmanuel",
  });

  if (m.activeClients > 0) {
    const food = m.clientsLoggingFood7d / m.activeClients;
    const train = m.clientsTraining7d / m.activeClients;
    const worst = Math.min(food, train);
    steps.push({
      key: "suivi",
      label: "Suivi des clientes",
      value: `${m.clientsLoggingFood7d}/${m.activeClients} notent leurs repas, ${m.clientsTraining7d}/${m.activeClients} s'entraînent (7 jours)`,
      tone: worst >= 0.7 ? "ok" : worst >= 0.4 ? "warn" : "bad",
      action: worst >= 0.7 ? null : "Ouvre « Clients à relancer » : un message court et personnel à chaque cliente silencieuse, aujourd'hui.",
      owner: "emmanuel",
    });
  }

  steps.push({
    key: "toi",
    label: "Ton propre suivi",
    value: `${m.selfFoodDays7d}/7 jours de repas notés, ${plural(m.selfSessions7d, "séance", "séances")} sur 7 jours`,
    tone: m.selfFoodDays7d >= 5 && m.selfSessions7d >= 3 ? "ok" : m.selfFoodDays7d >= 2 || m.selfSessions7d >= 1 ? "warn" : "bad",
    action:
      m.selfFoodDays7d >= 5 && m.selfSessions7d >= 3
        ? null
        : "Note tes repas et tes séances dans Moi. C'est ta preuve en vidéo, et c'est en l'utilisant toi-même que l'appli s'améliore pour tes clientes.",
    owner: "emmanuel",
  });

  // Le circuit se lit dans l'ordre : le premier maillon rouge bloque tout ce
  // qui suit. « Ton propre suivi » est à part (il ne bloque pas les ventes).
  const pipeline = steps.filter((s) => s.key !== "toi");
  const bottleneck = pipeline.find((s) => s.tone === "bad") ?? pipeline.find((s) => s.tone === "warn") ?? null;

  const tooMuchStock = m.videoStock > STOCK_CAP;
  return {
    steps,
    bottleneck,
    writingMode: tooMuchStock ? "retravailler_le_stock" : "ecrire",
    writingReason: tooMuchStock
      ? `${m.videoStock} vidéos attendent d'être tournées (plafond ${STOCK_CAP}) pour ${m.videoPublished7d} publiées en 7 jours : écrire du neuf ne fait pas avancer le business. On retravaille l'ancien stock (structure d'un vrai créateur, face caméra, version Points clés), du plus ancien au plus récent.`
      : `Stock de ${m.videoStock} vidéos, sous le plafond de ${STOCK_CAP} : on écrit normalement.`,
    writtenMode: m.writtenStock > WRITTEN_STOCK_CAP ? "retravailler_le_stock" : "ecrire",
  };
}

/** Texte court pour les routines et les outils MCP. */
export function businessLoopText(r: LoopReport): string {
  const icon = { ok: "🟢", warn: "🟠", bad: "🔴" } as const;
  const lines = r.steps.map((s) => `${icon[s.tone]} ${s.label} : ${s.value}${s.action ? `\n   → ${s.action}` : ""}`);
  return [
    "État du circuit EP Coaching (Notion → écriture → tournage → publication → DM → leads → appels → clientes) :",
    ...lines,
    "",
    r.bottleneck ? `Goulot : ${r.bottleneck.label}. ${r.bottleneck.action ?? ""}` : "Aucun maillon bloqué.",
    `Consigne d'écriture des vidéos (reels, YouTube) : ${r.writingMode === "ecrire" ? "écrire" : "retravailler le stock"}. ${r.writingReason}`,
    `Consigne des posts LinkedIn : ${r.writtenMode === "ecrire" ? "écrire (stock sous le plafond)" : "retravailler le stock"}.`,
  ].join("\n");
}
