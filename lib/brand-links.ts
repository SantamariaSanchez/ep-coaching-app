// Liens sociaux de la marque EP Coaching (pas un compte par coach, la
// vitrine globale). Utilisé par /bio (lien en bio Insta/TikTok) et par le
// générateur de contenu (lib/social-content.ts) pour signer les visuels.
//
// À REMPLIR : ces URLs sont des espaces réservés, à remplacer par les vrais
// comptes avant de mettre le lien en bio en avant sur les réseaux.
export const BRAND_SOCIALS = {
  instagram: {
    handle: "@ep.coaching",
    url: "https://instagram.com/ep.coaching",
  },
  tiktok: {
    handle: "@ep.coaching",
    url: "https://tiktok.com/@ep.coaching",
  },
} as const;
