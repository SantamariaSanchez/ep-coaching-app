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

const FEATURES: FeatureSpot[] = [
  {
    path: "/dashboard/client/nutrition",
    subject: "As-tu déjà loggé ton repas d'aujourd'hui ?",
    eyebrow: "Ta nutrition",
    hook: "Scanner un code-barres, valider un repas prévu en un tap, voir tes macros du jour en temps réel.",
    body: "Deux minutes par repas, et tu sais exactement où tu en es sur tes objectifs. Ton coach voit la même chose que toi, en direct, sans que tu aies à lui envoyer un message.",
    cta: "Ouvrir ma nutrition",
  },
  {
    path: "/dashboard/client/program",
    subject: "Ton programme du jour t'attend",
    eyebrow: "Ton programme",
    hook: "Chaque exercice de ta séance a sa fiche complète : reps, séries, technique, note d'exécution.",
    body: "Plus besoin de deviner ou de chercher sur internet en pleine séance. Tout est déjà dans l'appli, prêt à suivre.",
    cta: "Voir mon programme",
  },
  {
    path: "/dashboard/client/recettes",
    subject: "Une idée de repas qui rentre dans tes macros",
    eyebrow: "Les recettes",
    hook: "Une bibliothèque de recettes filtrable par macros, par temps de préparation, par ingrédients.",
    body: "Fini le repas fade juste pour coller aux chiffres. Trouve une recette qui te fait plaisir ET qui rentre dans ton plan.",
    cta: "Trouver une recette",
  },
  {
    path: "/dashboard/client/steps",
    subject: "Ton objectif de pas du jour, tu en es où ?",
    eyebrow: "Tes pas",
    hook: "Les pas comptent autant que la séance pour ta dépense énergétique totale sur la semaine.",
    body: "Un objectif clair, un suivi simple, et tu vois l'impact réel sur ta progression, pas juste le jour de séance.",
    cta: "Suivre mes pas",
  },
  {
    path: "/dashboard/client/ressources",
    subject: "Un guide gratuit qui peut vraiment t'aider",
    eyebrow: "Les ressources",
    hook: "Des centaines de guides, checklists et quiz gratuits, sourcés sur la vraie littérature scientifique.",
    body: "Nutrition, entraînement, récupération, mental : il y a très probablement un guide sur exactement ce qui te bloque en ce moment.",
    cta: "Parcourir les ressources",
  },
  {
    path: "/dashboard/client/science",
    subject: "Arrête de croire tout ce que tu lis sur les réseaux",
    eyebrow: "La bibliothèque scientifique",
    hook: "Une bibliothèque d'articles sourcés directement sur les études, pas sur des opinions.",
    body: "Ce que dit vraiment la recherche sur ce qui marche, pas ce qu'un compte affirme sans preuve derrière.",
    cta: "Explorer la bibliothèque",
  },
  {
    path: "/dashboard/client/communaute",
    subject: "Tu n'es pas tout seul là-dedans",
    eyebrow: "La communauté",
    hook: "D'autres membres qui avancent sur les mêmes objectifs que toi, dans le même espace.",
    body: "Partage une victoire, pose une question, vois où en sont les autres. Ça aide de ne pas être seul dans la durée.",
    cta: "Voir la communauté",
  },
  {
    path: "/dashboard/client/mindset",
    subject: "Le mental compte autant que l'entraînement",
    eyebrow: "Le mental",
    hook: "Une section entière dédiée à la psychologie de la progression : motivation, discipline, gestion des échecs.",
    body: "Le physique suit rarement quand la tête ne suit pas. Cette section existe pour ça, pas juste pour les macros.",
    cta: "Découvrir cette section",
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
<h1 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">Tu utilises déjà l'appli. Et si on allait plus loin ensemble ?</h1>
<p style="margin:0 0 12px;">L'appli te donne les outils. Un accompagnement 1 à 1 te donne un plan qui s'adapte vraiment à toi, semaine après semaine, avec quelqu'un qui regarde tes résultats et ajuste avant que tu stagnes.</p>
<p style="margin:0 0 4px;color:rgba(245,237,237,0.75);">Aucune pression. Si tu es curieux de voir si ça peut t'aider, réponds simplement à ce mail.</p>`;
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
    subject = "Et si on allait plus loin ensemble ?";
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
