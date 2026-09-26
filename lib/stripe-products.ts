// Price IDs Stripe de la grille du 2026-09-16 (créés le 2026-09-24, compte
// EP Coaching live). Sert à reconnaître ce qui vient d'être payé dans le
// webhook, y compris quand le paiement passe par un lien envoyé à la main par
// un closer (aucun compte dans l'appli, donc aucun client_reference_id).
export type ProductKey = "coaching_physique" | "coaching_business" | "saas_standard" | "saas_premium" | "formation";

export const STRIPE_PRICE_TO_PRODUCT: Record<string, ProductKey> = {
  price_1UJ70FDArIBDR6d6TmrbZi7C: "coaching_physique",
  price_1UJ70NDArIBDR6d6d2OeHoql: "coaching_business",
  price_1UJ70WDArIBDR6d623NDzjya: "saas_standard",
  price_1UJ70fDArIBDR6d652mTexaD: "saas_premium",
  price_1UJ70nDArIBDR6d6vUhanxMY: "formation",
};

// Lien de paiement de la formation à l'unité (100 €, paiement unique, créé
// le 2026-09-26). Interne à l'équipe : jamais affiché publiquement.
export const FORMATION_PAYMENT_URL = "https://buy.stripe.com/7sYcN57y3gh57jS1TlfIs0d";

export const PRODUCT_LABELS: Record<ProductKey, string> = {
  coaching_physique: "Coaching individuel physique",
  coaching_business: "Coaching business",
  saas_standard: "SaaS Standard",
  saas_premium: "SaaS Premium",
  formation: "Formation",
};

/** Les produits qui déclenchent un vrai accompagnement humain (suivi J+30). */
export function isCoachingProduct(p: ProductKey | null): boolean {
  return p === "coaching_physique" || p === "coaching_business";
}
