// Séquences de mails automatiques (2026-11-16, demande d'Emmanuel :
// « relance lead J+2 J+4 J+8 J+16, l'onboarding, les rappels J-10 J-5 J-2
// J-1 H-1 min-30 avant les audits stratégiques, toujours personnalisé »).
// Un seul moteur pour trois parcours ; chaque envoi est noté dans
// sequence_sends (une étape ne part jamais deux fois). Fichier pur : les
// règles d'échéance et le texte des mails, testés sans réseau.

export type SequenceKind = "lead" | "audit" | "onboarding";

export interface Step {
  key: string;
  /** Lead et onboarding : jours après l'ancre. Audit : minutes AVANT le rendez-vous. */
  at: number;
}

export const LEAD_STEPS: Step[] = [
  { key: "j2", at: 2 },
  { key: "j4", at: 4 },
  { key: "j8", at: 8 },
  { key: "j16", at: 16 },
  { key: "j30", at: 30 },
];

export const ONBOARDING_STEPS: Step[] = [
  { key: "j1", at: 1 },
  { key: "j3", at: 3 },
  { key: "j7", at: 7 },
];

export const AUDIT_STEPS: Step[] = [
  { key: "j10", at: 10 * 1440 },
  { key: "j5", at: 5 * 1440 },
  { key: "j2", at: 2 * 1440 },
  { key: "j1", at: 1440 },
  { key: "h1", at: 60 },
  { key: "m30", at: 30 },
];

const DAY = 86_400_000;

/**
 * Étape « jours après » à envoyer maintenant, ou null. Une étape part le jour
 * prévu ou le lendemain (rattrapage si le cron a sauté), jamais plus tard :
 * pas de rafale de vieilles relances.
 */
export function dueDayStep(steps: Step[], anchorIso: string, now: number, sent: Set<string>): Step | null {
  const ageDays = (now - new Date(anchorIso).getTime()) / DAY;
  for (const s of steps) {
    if (sent.has(s.key)) continue;
    if (ageDays >= s.at && ageDays < s.at + 2) return s;
  }
  return null;
}

/**
 * Rappel d'audit à envoyer maintenant, ou null : la dernière étape atteinte,
 * seulement si on est encore proche de son seuil (les plus anciennes sont
 * sautées, un rendez-vous pris 3 jours avant ne reçoit pas le J-10).
 */
export function dueAuditStep(startIso: string, now: number, sent: Set<string>): Step | null {
  const minutesBefore = (new Date(startIso).getTime() - now) / 60_000;
  if (minutesBefore <= 0) return null;
  const reached = AUDIT_STEPS.filter((s) => minutesBefore <= s.at);
  const last = reached[reached.length - 1];
  if (!last || sent.has(last.key)) return null;
  const lateness = Math.max(12, last.at * 0.1);
  return minutesBefore >= last.at - lateness ? last : null;
}

/** Heure de Paris (0-23) pour un instant donné. */
export function parisHour(now: number): number {
  return Number(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(new Date(now)));
}

/** Les relances lead et onboarding ne partent qu'en journée ; les rappels d'audit, à toute heure. */
export function isSendingHour(now: number): boolean {
  const h = parisHour(now);
  return h >= 9 && h < 20;
}

export function firstName(full: string | null | undefined): string | null {
  const f = (full ?? "").trim().split(/\s+/)[0];
  return f && f.length <= 40 ? f : null;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const P = (t: string) => `<p style="margin:0 0 14px;">${t}</p>`;
const LINK = (href: string, label: string) => `<p style="margin:18px 0;"><a href="${href}" style="color:#E01E1E;font-weight:700;text-decoration:underline;">${label}</a></p>`;
const SIGN = `<p style="margin:18px 0 0;">Santamaria</p>`;

export interface MailContent {
  subject: string;
  html: string;
}

export interface LeadMailInput {
  step: string;
  guideTitle: string;
  guideUrl: string;
  appUrl: string;
  candidatureUrl: string;
}

/** Relances après un guide gratuit. Une idée par mail, un seul lien. */
export function leadMail(i: LeadMailInput): MailContent | null {
  const g = esc(i.guideTitle);
  const stop = `<p style="margin:18px 0 0;font-size:12px;color:rgba(245,237,237,0.45);">Tu ne veux plus de ces messages ? Désabonne-toi en bas de n'importe quel mail de la newsletter, les relances s'arrêtent avec.</p>`;
  switch (i.step) {
    case "j2":
      return {
        subject: "tu as eu le temps de le lire ?",
        html: P("Salut,") + P(`Il y a deux jours tu as pris « ${g} ».`) + P("Un guide ne sert à rien s'il reste ouvert dans un onglet. Choisis une seule chose dedans, celle qui te parle le plus, et applique-la cette semaine. Une seule.") + LINK(i.guideUrl, "Retrouver le guide") + SIGN + stop,
      };
    case "j4":
      return {
        subject: "le plan qui tient, pas le plan parfait",
        html: P("Salut,") + P("Ce qui fait perdre du gras, ce n'est pas le plan le plus strict. C'est celui que tu tiens encore dans trois semaines, même avec un resto ou une soirée au milieu.") + P("Pour le tenir, il faut voir où tu en es. L'appli EP Coaching te sert à ça : tes repas, tes séances et ta semaine au même endroit. La version gratuite suffit pour commencer.") + LINK(`${i.appUrl}/auth/client?src=email`, "Créer mon compte gratuit") + SIGN + stop,
      };
    case "j8":
      return {
        subject: "tu fais ça seul(e) ?",
        html: P("Salut,") + P("Une semaine que tu as le guide. Si tu avances, garde le rythme.") + P("Si tu bloques toujours au même endroit, ce n'est pas un manque de volonté. C'est souvent qu'il manque quelqu'un pour adapter le plan à ta vraie semaine.") + P("C'est ce que je fais en coaching. Tu remplis un court formulaire, je le lis moi-même, et je te dis honnêtement si je peux t'aider.") + LINK(`${i.candidatureUrl}?src=email`, "Remplir le formulaire") + SIGN + stop,
      };
    case "j16":
      return {
        subject: "une question, une seule",
        html: P("Salut,") + P("Qu'est-ce qui te bloque le plus en ce moment pour perdre du gras ?") + P("Réponds à ce mail en une phrase. Je lis les réponses, et elles me servent à écrire ce qui t'aide vraiment.") + SIGN + stop,
      };
    case "j30":
      return {
        subject: "je ne te relance plus après ça",
        html: P("Salut,") + P("C'est le dernier mail de relance. Tu continues à recevoir la newsletter, une idée concrète par mail.") + P("Si un jour tu veux un plan adapté à ta semaine, le formulaire reste ouvert.") + LINK(`${i.candidatureUrl}?src=email`, "Remplir le formulaire") + SIGN + stop,
      };
    default:
      return null;
  }
}

export interface AuditMailInput {
  step: string;
  name: string | null;
  startsAt: string;
  joinUrl: string | null;
}

/** Date et heure de Paris lisibles, ex. « mardi 18 novembre à 14 h 30 ». */
export function parisWhen(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(d);
  const [h, m] = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).format(d).split(":");
  return `${day} à ${Number(h)} h${m === "00" ? "" : ` ${m}`}`;
}

/** Rappels avant l'audit stratégique. Préparation concrète, jamais de pression. */
export function auditMail(i: AuditMailInput): MailContent | null {
  const hi = i.name ? `Salut ${esc(i.name)},` : "Salut,";
  const when = parisWhen(i.startsAt);
  const join = i.joinUrl ? LINK(i.joinUrl, "Le lien de l'appel") : "";
  const prep = P("Pour que l'appel te serve vraiment, note avant : ton objectif en une phrase, ta semaine type (travail, sommeil, sport), et ce que tu as déjà essayé. Pas besoin que ce soit parfait.");
  switch (i.step) {
    case "j10":
    case "j5":
      return { subject: `ton audit stratégique, ${when}`, html: P(hi) + P(`Ton audit stratégique est bien noté : ${esc(when)}.`) + prep + P("Un empêchement ? Déplace le rendez-vous depuis le mail de confirmation, ça libère la place pour quelqu'un d'autre.") + SIGN };
    case "j2":
      return { subject: "ton audit, dans 2 jours", html: P(hi) + P(`On se parle ${esc(when)}.`) + prep + SIGN };
    case "j1":
      return { subject: "on se parle demain", html: P(hi) + P(`C'est demain : ${esc(when)}.`) + P("Prévois un endroit calme et 30 minutes. Garde tes notes à côté de toi.") + join + SIGN };
    case "h1":
      return { subject: "dans une heure", html: P(hi) + P("On se parle dans une heure. Garde tes notes à côté de toi.") + join + SIGN };
    case "m30":
      return { subject: "dans 30 minutes", html: P(hi) + P("Dans 30 minutes, c'est à nous.") + (join || P("Le lien est dans ton mail de confirmation.")) + SIGN };
    default:
      return null;
  }
}

export interface OnboardingMailInput {
  step: string;
  name: string | null;
  appUrl: string;
}

/** Inscrits qui n'ont pas fini l'onboarding. */
export function onboardingMail(i: OnboardingMailInput): MailContent | null {
  const hi = i.name ? `Salut ${esc(i.name)},` : "Salut,";
  const go = LINK(`${i.appUrl}/onboarding?src=email`, "Finir de configurer mon espace");
  switch (i.step) {
    case "j1":
      return { subject: "il te reste 2 minutes", html: P(hi) + P("Ton compte est créé, mais ton espace n'est pas encore réglé. Sans ton objectif et ta semaine type, l'appli ne peut rien adapter à toi.") + P("Ça prend deux minutes.") + go + SIGN };
    case "j3":
      return { subject: "ton plan attend tes réponses", html: P(hi) + P("Ton plan se construit à partir de quelques réponses : ton objectif, ton matériel, le temps que tu as vraiment.") + P("Tant qu'elles manquent, tu n'as qu'un plan générique. Termine-les et tout s'adapte.") + go + SIGN };
    case "j7":
      return { subject: "on reprend ?", html: P(hi) + P("Ça fait une semaine. Si ce n'était pas le bon moment, aucun souci, ton compte reste là.") + P("Quand tu veux reprendre, tout est gardé là où tu t'es arrêté(e).") + go + SIGN };
    default:
      return null;
  }
}
