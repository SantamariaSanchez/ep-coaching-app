// Retour d'usage attendu (jamais mesuré jusqu'ici, mais visible dans le
// code) : le déblocage était mémorisé PAR guide (UNLOCK_PREFIX + slug), donc
// un visiteur qui a déjà laissé son email pour un premier guide devait
// retaper email/téléphone pour CHAQUE guide suivant qu'il ouvrait — alors
// que ce sont justement les leads qui en consultent plusieurs qui sont les
// plus qualifiés. Mémorise maintenant le contact une fois donné (clé
// partagée, pas par slug) pour débloquer automatiquement, en silence, les
// guides suivants — sans jamais sauter l'appel `submitLead` par guide : la
// ligne `leads` par (slug, email) reste écrite normalement, c'est la seule
// donnée qui dit vraiment quels guides intéressent ce contact.
// Partagé avec l'inscription (app/auth/client/SignupFlow.tsx) : un lead qui
// crée son compte ne retape pas l'email et le numéro déjà donnés pour un guide.
const CONTACT_KEY = "ep-lead-contact";


export function readRememberedContact(): { email: string; phone: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONTACT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: unknown; phone?: unknown };
    const email = typeof parsed.email === "string" ? parsed.email : "";
    const phone = typeof parsed.phone === "string" ? parsed.phone : "";
    return email || phone ? { email, phone } : null;
  } catch {
    return null;
  }
}

export function rememberContact(email: string, phone: string) {
  try {
    localStorage.setItem(CONTACT_KEY, JSON.stringify({ email, phone }));
  } catch {
    // stockage indisponible, tant pis, juste pas de déblocage auto la prochaine fois
  }
}
