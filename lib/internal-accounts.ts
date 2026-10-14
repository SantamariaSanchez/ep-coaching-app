// Comptes qui ne sont pas de vraies personnes inscrites : les 10 coachs IA
// (adresses @ep-coaching.internal), les comptes démo (demo.*@epcoaching.app)
// et le compte coach de test du fondateur. Ils restent utilisables, mais ne
// comptent jamais dans les listes et les chiffres « inscrits » / « coachs ».
// Les 19 agents IA, eux, n'ont pas de compte (lib/ai-agents.ts).

export const AI_COACH_EMAIL_DOMAIN = "@ep-coaching.internal";
const FOUNDER_TEST_EMAILS = ["emmanuelpeccoux1@gmail.com"];

export type InternalKind = "ia" | "demo" | "test";

export function internalAccountKind(p: { email?: string | null; is_ai_coach?: boolean | null }): InternalKind | null {
  const email = (p.email ?? "").toLowerCase();
  if (p.is_ai_coach || email.endsWith(AI_COACH_EMAIL_DOMAIN)) return "ia";
  if (/^demo(\.[a-z0-9]+)*@epcoaching\.app$/.test(email)) return "demo";
  if (FOUNDER_TEST_EMAILS.includes(email)) return "test";
  return null;
}

export function isRealAccount(p: { email?: string | null; is_ai_coach?: boolean | null }): boolean {
  return internalAccountKind(p) === null;
}
