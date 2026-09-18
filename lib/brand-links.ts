// Liens sociaux de la marque EP Coaching (pas un compte par coach, la
// vitrine globale). Utilisé par /bio (lien en bio Insta/TikTok) et par le
// générateur de contenu (lib/social-content.ts) pour signer les visuels.
//
// À REMPLIR : ces URLs sont des espaces réservés, à remplacer par les vrais
// comptes/numéro avant de mettre le lien en bio en avant sur les réseaux.
export const BRAND_SOCIALS = {
  instagram: {
    handle: "@ep.coaching",
    url: "https://instagram.com/ep.coaching",
  },
  tiktok: {
    handle: "@ep.coaching",
    url: "https://tiktok.com/@ep.coaching",
  },
  // Format wa.me : numéro complet, sans le "+" ni espaces (ex "33612345678"
  // pour un numéro français). Retour direct 2026-08-16 : contact humain
  // réel plutôt qu'un compte Instagram qui n'est pas le sien. Numéro
  // fourni le 2026-08-17 (0766834777 → 33766834777 au format wa.me).
  whatsapp: {
    url: "https://wa.me/33766834777",
  },
} as const;

// Comptes personnels de Santamaria Sanchéz, réels et confirmés (contrairement
// aux placeholders @ep.coaching ci-dessus) — utilisés dans les données
// structurées (schema.org `sameAs`) sur app/page.tsx ET app/coachs/page.tsx.
// Centralisé ici (retour direct 2026-09-17 : "quand on cherche mon nom sur
// Google/l'IA, il faut qu'on ressorte") pour que ces deux pages ne dérivent
// jamais l'une de l'autre au fil des modifications futures.
export const SANTAMARIA_SOCIALS = [
  "https://instagram.com/santamariasanchez_",
  "https://www.tiktok.com/@santamariasanchez_",
  "https://www.youtube.com/@santamaria_sanchez",
] as const;
