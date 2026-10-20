import { after } from "next/server";

// Travail à finir après la réponse (notif, mail…) : lancé sans attendre, il
// était souvent perdu sur Vercel, la fonction s'arrêtant dès la réponse
// envoyée. after() la garde en vie jusqu'au bout ; hors requête (cron
// appelé autrement, script), on l'exécute tout de suite.
export function runAfterResponse(task: () => Promise<unknown>): Promise<void> {
  const safe = () => task().then(() => undefined, (e) => console.error("tâche après réponse :", e));
  try {
    after(safe);
    return Promise.resolve();
  } catch {
    return safe();
  }
}
