import type { KeyboardEvent } from "react";

// Un <div role="button"> reçoit bien le focus clavier avec tabIndex={0},
// mais contrairement à un vrai <button>, Entrée/Espace n'activent jamais
// onClick nativement dessus — sans ce handler, le focus clavier est
// atteignable mais inutilisable. Réservé aux cas où un vrai <button> est
// impossible (contient déjà d'autres <button> imbriqués, invalide en HTML) ;
// partout ailleurs, un vrai <button> reste préférable, il gère déjà ça tout seul.
export function onKeyActivate(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };
}
