import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendCoachCampaign, wrapBrandedEmail } from "@/lib/brevo-mailing";

// Newsletter quotidienne "valeur app" pour tous les membres EP Coaching
// (demande explicite 2026-08-30 : "que le mailing des membres soit
// optimisé... apporte un max de valeur pour qu'ils utilisent l'appli, et
// qu'avec le temps ça m'amène des clients"). Contrainte de cadence donnée :
// minimum 1 mail tous les 2 jours, maximum 3 par jour. Un envoi quotidien
// unique respecte confortablement les deux bornes sans risque de spam.
//
// Réutilise l'infra mailing déjà existante (lib/brevo-mailing.ts,
// sendCoachCampaign avec audience "tous_les_membres") : elle crée/gère déjà
// la liste Brevo "Tous les membres EP Coaching", synchronise les vrais
// membres (profiles role=client) et habille le mail avec l'identité rouge
// sombre de l'appli (wrapBrandedEmail). Rien à reconstruire, juste à
// automatiser avec du contenu qui tourne.
//
// Angle du jour : rotation déterministe par jour de l'année (aucun état à
// stocker) sur 7 jours : feature/leadmagnet en alternance, une relance
// coaching douce tous les 7 jours seulement (valeur d'abord, vente rare).

const APP_URL = "https://ep-coaching.vercel.app";
const OWNER_ID = "845b826a-0e2f-4c44-8130-a8fe1e925351";
const OWNER_NAME = "Santamaria";

function dayOfYear(d: Date): number {
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function ctaButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto 4px;"><tr><td style="border-radius:10px;background:#E01E1E;"><a href="${url}" style="display:inline-block;padding:13px 30px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a></td></tr></table>`;
}

interface FeatureSpot {
  path: string;
  subject: string;
  eyebrow: string;
  hook: string;
  body: string;
  cta: string;
}

// Ton Hormozi (retour fondateur 2026-10-09 : « faut plus charbonner ») :
// phrases courtes, le vrai problème, ce qu'il coûte, une seule action.
const FEATURES: FeatureSpot[] = [
  {
    path: "/dashboard/client/nutrition",
    subject: "Tu ne grossis pas. Tu ne sèches pas. Voilà pourquoi.",
    eyebrow: "Ta nutrition",
    hook: "La plupart des gens pensent qu'ils mangent bien. Ils ne savent pas. Ils devinent.",
    body: "Et deviner, ça coûte des mois. Ouvre ta nutrition, valide tes repas en un tap ou scanne le code-barres. Deux minutes par repas. Tu sais enfin où tu en es, et ton coach aussi.",
    cta: "Ouvrir ma nutrition",
  },
  {
    path: "/dashboard/client/program",
    subject: "Arrête d'improviser tes séances",
    eyebrow: "Ton programme",
    hook: "Tu arrives à la salle, tu fais ce qui est libre, tu repars. C'est pour ça que rien ne bouge.",
    body: "Ta séance est déjà écrite : exercices, séries, reps, technique. Tu n'as plus qu'à exécuter. Le gars qui exécute un plan moyen bat toujours le gars qui improvise un plan parfait.",
    cta: "Voir ma séance",
  },
  {
    path: "/dashboard/client/recettes",
    subject: "Manger bien sans manger triste",
    eyebrow: "Les recettes",
    hook: "Si ta diète est fade, tu vas craquer. Pas parce que tu es faible. Parce que personne ne tient en mangeant du riz poulet brocoli.",
    body: "Filtre les recettes par macros, par temps, par ingrédients. Tu choisis un plat qui te fait envie et qui rentre dans ton plan. Ce que tu aimes, tu le tiens.",
    cta: "Trouver une recette",
  },
  {
    path: "/dashboard/client/steps",
    subject: "Le levier que tout le monde oublie",
    eyebrow: "Tes pas",
    hook: "Une séance, c'est une heure. Il t'en reste 23. C'est là que se joue ta dépense de la semaine.",
    body: "Les pas, c'est le levier le plus simple et le plus ignoré. Un objectif clair, tu le suis, et tu vois la différence sur la balance sans toucher à ton assiette.",
    cta: "Suivre mes pas",
  },
  {
    path: "/dashboard/client/ressources",
    subject: "La réponse à ta question existe déjà",
    eyebrow: "Les guides gratuits",
    hook: "Plus de 1000 guides, checklists et quiz. Gratuits. Chacun répond à une vraie question.",
    body: "Ce qui te bloque en ce moment, il y a de grandes chances qu'un guide le règle en 5 minutes. Tape ton problème, lis, applique. C'est tout.",
    cta: "Trouver mon guide",
  },
  {
    path: "/dashboard/client/science",
    subject: "Arrête de croire tout ce que tu lis sur les réseaux",
    eyebrow: "La bibliothèque",
    hook: "Un conseil par vidéo, dix vidéos par jour, et elles se contredisent toutes. Tu ne manques pas d'infos. Tu en as trop.",
    body: "La bibliothèque te donne ce que disent vraiment les études, en clair. Tu arrêtes de changer de méthode toutes les semaines.",
    cta: "Ouvrir la bibliothèque",
  },
  {
    path: "/dashboard/client/communaute",
    subject: "Ceux qui réussissent ne le font pas seuls",
    eyebrow: "La communauté",
    hook: "Seul, tu lâches le jour où la motivation tombe. Entouré, tu continues parce que les autres continuent.",
    body: "Poste une victoire, même petite. Pose ta question. Regarde où en sont les autres. Ça prend 30 secondes et ça te tient des mois.",
    cta: "Voir la communauté",
  },
  {
    path: "/dashboard/client/mindset",
    subject: "Ton problème n'est pas ton programme",
    eyebrow: "Le mental",
    hook: "Tu sais quoi faire. Tu ne le fais pas. Ce n'est pas un problème d'info, c'est un problème de tête.",
    body: "La section mental est là pour ça : discipline, rechutes, motivation qui disparaît. Règle ça et le reste suit.",
    cta: "Travailler mon mental",
  },
];

interface LeadMagnetRow {
  slug: string;
  title: string;
  hook: string;
  category: string;
}

async function pickLeadMagnet(): Promise<LeadMagnetRow | null> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("lead_magnets")
    .select("*", { count: "exact", head: true })
    .eq("published", true);
  if (!count || count === 0) return null;

  const offset = Math.floor(Math.random() * count);
  const { data } = await admin
    .from("lead_magnets")
    .select("slug, title, hook, category")
    .eq("published", true)
    .order("keyword", { ascending: true })
    .range(offset, offset);
  return (data as LeadMagnetRow[] | null)?.[0] ?? null;
}

function featureEmailBody(f: FeatureSpot): string {
  return `<p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">${f.eyebrow}</p>
<h1 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">${f.subject}</h1>
<p style="margin:0 0 12px;">${f.hook}</p>
<p style="margin:0 0 4px;color:rgba(245,237,237,0.75);">${f.body}</p>
<div style="text-align:center;">${ctaButton(f.cta, `${APP_URL}${f.path}`)}</div>`;
}

function leadMagnetEmailBody(lm: LeadMagnetRow): string {
  return `<p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">${lm.category}</p>
<h1 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">${lm.title}</h1>
<p style="margin:0 0 4px;color:rgba(245,237,237,0.75);">${lm.hook}</p>
<div style="text-align:center;">${ctaButton("Lire le guide gratuit", `${APP_URL}/ressources/${lm.slug}`)}</div>`;
}

function coachingNudgeBody(): string {
  return `<p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">Aller plus loin</p>
<h1 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">L'appli te donne les outils. Pas le plan.</h1>
<p style="margin:0 0 12px;">Tu peux tout faire seul. Ça marche. Mais ça prend deux fois plus de temps, parce que personne ne te dit quand tu te trompes.</p>
<p style="margin:0 0 12px;">En accompagnement, je regarde tes chiffres chaque semaine et j'ajuste avant que tu stagnes. Tu exécutes, je pilote.</p>
<p style="margin:0 0 4px;color:rgba(245,237,237,0.75);">Si tu veux savoir si c'est pour toi, réponds juste « plan » à ce mail. Pas de pression, pas de discours.</p>`;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const doy = dayOfYear(now);
  // 7 jours de rotation, 1 seule relance coaching (index 6) : valeur
  // largement dominante, vente rare et jamais insistante.
  const slot = doy % 7;

  let subject: string;
  let bodyHtml: string;

  if (slot === 6) {
    subject = "L'appli te donne les outils. Pas le plan.";
    bodyHtml = coachingNudgeBody();
  } else if (slot % 2 === 0) {
    const lm = await pickLeadMagnet();
    if (!lm) {
      const f = FEATURES[doy % FEATURES.length];
      subject = f.subject;
      bodyHtml = featureEmailBody(f);
    } else {
      subject = lm.title.replace(/^\d+\s*-\s*/, "");
      bodyHtml = leadMagnetEmailBody(lm);
    }
  } else {
    const f = FEATURES[doy % FEATURES.length];
    subject = f.subject;
    bodyHtml = featureEmailBody(f);
  }

  try {
    const result = await sendCoachCampaign(
      OWNER_ID,
      OWNER_NAME,
      subject,
      wrapBrandedEmail(bodyHtml),
      { type: "tous_les_membres" }
    );
    return NextResponse.json({ ok: true, ...result, subject });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
