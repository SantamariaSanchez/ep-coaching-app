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
  // réel plutôt qu'un compte Instagram qui n'est pas le sien.
  whatsapp: {
    url: "https://wa.me/33000000000",
  },
} as const;
