// MASTERCLASS.md Axe L : "aujourd'hui" calculé côté serveur avec
// `new Date().toISOString().split("T")[0]` donne la date en UTC, pas celle
// de l'utilisateur. Cette appli est 100% francophone (voir AGENTS.md) et
// Vercel exécute son code en UTC — entre minuit et 1h/2h du matin heure de
// Paris (selon heure d'été/hiver), le serveur croit encore être hier.
// Pendant cette fenêtre, tout ce qui dépend d'un "aujourd'hui" calculé
// côté serveur (nutrition, pas, séances, bilan, habitudes...) pointait sur
// la mauvaise date pour l'utilisateur.
//
// `Intl.DateTimeFormat` avec `timeZone: "Europe/Paris"` gère automatiquement
// le passage heure d'été/hiver, contrairement à un simple décalage fixe
// (+1 ou +2h) qui serait faux la moitié de l'année.
export function todayInParis(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${year}-${month}-${day}`;
}
