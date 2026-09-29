// Liens sociaux de la marque EP Coaching (pas un compte par coach, la
// vitrine globale). Utilisé par /bio (lien en bio Insta/TikTok) et par le
// générateur de contenu (lib/social-content.ts) pour signer les visuels.
//
// Instagram et Threads : nouveau compte propre @santamariasanchezep depuis
// le 2026-09-29 (retour direct : "Instagram on a re enfin, nouveau compte
// propre santamariasanchezep", "on a re Threads"). Threads reprend toujours
// l'identifiant Instagram.
export const INSTAGRAM_HANDLE = "santamariasanchezep";
export const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;
export const THREADS_URL = `https://www.threads.net/@${INSTAGRAM_HANDLE}`;

export const BRAND_SOCIALS = {
  instagram: {
    handle: `@${INSTAGRAM_HANDLE}`,
    url: INSTAGRAM_URL,
  },
  threads: {
    handle: `@${INSTAGRAM_HANDLE}`,
    url: THREADS_URL,
  },
  tiktok: {
    handle: "@santamariasanchez_",
    url: "https://www.tiktok.com/@santamariasanchez_",
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
  INSTAGRAM_URL,
  THREADS_URL,
  "https://www.tiktok.com/@santamariasanchez_",
  "https://www.youtube.com/@santamaria_sanchez",
] as const;
