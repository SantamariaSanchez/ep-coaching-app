// Espace "Développer mon business" (Axe 6, VISION.md — demande directe
// 2026-08-19 : "un autre espace pour tout ce qui est entreprenariat...
// pas juste gérer leurs clients mais aussi tout ce qui dev son business
// de coaching... des vrai process, des systèmes, des séquences story
// carrousel insta video youtube TOF/MOF/BOF... construire une personal
// brand... une vraie stratégie claire").
//
// Le studio créatif (app/dashboard/coach/studio, table coach_ideation_notes/
// coach_scripts/coach_inspirations) est DÉJÀ scopé par coach_id — chaque
// coach a déjà son propre espace privé de création de contenu, pas besoin
// de le reconstruire. Ce fichier fournit le CADRE qui manquait par-dessus
// (funnel TOF/MOF/BOF, gabarits par format) et la checklist de
// construction de marque personnelle — la partie qui n'existait nulle
// part.

export type FunnelStage = "TOF" | "MOF" | "BOF";

export interface FunnelStageInfo {
  key: FunnelStage;
  label: string;
  goal: string;
  formats: { platform: string; format: string; idea: string }[];
}

export const FUNNEL_STAGES: FunnelStageInfo[] = [
  {
    key: "TOF",
    label: "TOF — Top of funnel",
    goal: "Se faire découvrir par quelqu'un qui ne te connaît pas encore. Un contenu TOF doit fonctionner sans aucun contexte préalable.",
    formats: [
      { platform: "Instagram", format: "Reel", idea: "Un mythe fitness démonté en 30 secondes, ou un avant/après réel de client (avec accord)." },
      { platform: "Instagram", format: "Carrousel", idea: "\"5 erreurs que tout le monde fait en [sujet]\" — accroche forte sur la 1ère image." },
      { platform: "YouTube", format: "Short", idea: "Réponse directe à une question fréquente, format vertical, sans intro." },
    ],
  },
  {
    key: "MOF",
    label: "MOF — Middle of funnel",
    goal: "Approfondir avec quelqu'un qui te suit déjà mais n'est pas encore convaincu. Montre ta méthode, pas juste ton résultat.",
    formats: [
      { platform: "Instagram", format: "Story (séquence)", idea: "Coulisses d'une vraie séance ou d'un vrai bilan client, montrées en plusieurs stories." },
      { platform: "Instagram", format: "Carrousel", idea: "Explique TA méthode pas à pas sur un sujet précis (pas un conseil générique de plus)." },
      { platform: "YouTube", format: "Vidéo longue", idea: "Décortique un cas client réel (anonymisé) du problème à la solution." },
    ],
  },
  {
    key: "BOF",
    label: "BOF — Bottom of funnel",
    goal: "Convertir quelqu'un déjà convaincu du fond, qui hésite encore sur la forme (prix, confiance, timing).",
    formats: [
      { platform: "Instagram", format: "Story", idea: "Témoignage client en story avec réponse à une objection courante (prix, temps, motivation)." },
      { platform: "Instagram", format: "Post fixe", idea: "Présentation claire de l'offre : ce qui est inclus, pour qui, comment démarrer." },
      { platform: "YouTube", format: "Vidéo", idea: "\"Ce à quoi ressemble vraiment un accompagnement avec moi\", sans survendre." },
    ],
  },
];

export interface BusinessChecklistItem {
  key: string;
  category: string;
  label: string;
  detail: string;
}

export const BUSINESS_CHECKLIST: BusinessChecklistItem[] = [
  // ── Positionnement ──────────────────────────────────────────────────
  {
    key: "positioning-statement",
    category: "Positionnement",
    label: "Une phrase claire de positionnement",
    detail: "Qui tu aides, avec quel problème précis, avec quelle méthode — une seule phrase, pas un paragraphe.",
  },
  {
    key: "positioning-niche",
    category: "Positionnement",
    label: "Une spécialité déclarée",
    detail: "Renseignée dans Paramètres > Spécialisations, visible dans l'annuaire public /coachs.",
  },
  // ── Personal branding ───────────────────────────────────────────────
  {
    key: "brand-bio",
    category: "Personal branding",
    label: "Bio Instagram optimisée",
    detail: "Qui tu es, pour qui, un lien unique et à jour — pas une bio générique copiée d'ailleurs.",
  },
  {
    key: "brand-profile-photo",
    category: "Personal branding",
    label: "Photo de profil professionnelle",
    detail: "Visage visible, cohérente sur toutes les plateformes utilisées.",
  },
  {
    key: "brand-visual-identity",
    category: "Personal branding",
    label: "Identité visuelle cohérente",
    detail: "Mêmes couleurs/police/ton sur les contenus, pour être reconnaissable au premier coup d'œil.",
  },
  // ── Contenu ──────────────────────────────────────────────────────────
  {
    key: "content-rhythm",
    category: "Contenu",
    label: "Un rythme de publication tenable défini",
    detail: "Mieux vaut 2 posts/semaine tenus sur 6 mois qu'un rythme intenable abandonné après 3 semaines.",
  },
  {
    key: "content-funnel-mix",
    category: "Contenu",
    label: "Un mix TOF/MOF/BOF pensé, pas au hasard",
    detail: "Voir le funnel ci-dessus — la majorité du contenu doit rester TOF (découverte), pas juste BOF (vente).",
  },
  {
    key: "content-studio",
    category: "Contenu",
    label: "Studio créatif utilisé pour planifier, pas improviser",
    detail: "Idéation, scripts et inspirations centralisés dans ton propre Studio créatif plutôt que dans ta tête.",
  },
  // ── Preuve sociale & conversion ──────────────────────────────────────
  {
    key: "proof-testimonials",
    category: "Preuve sociale",
    label: "Au moins 3 témoignages clients réels collectés",
    detail: "Avec l'accord explicite du client — avant/après, ressenti, résultat concret.",
  },
  {
    key: "conversion-offer-clarity",
    category: "Conversion",
    label: "Une offre claire et un chemin pour la rejoindre",
    detail: "Ton lien d'invitation personnel (Paramètres) partagé et facile à trouver depuis ta bio/tes contenus.",
  },
];
