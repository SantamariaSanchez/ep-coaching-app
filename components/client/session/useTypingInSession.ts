"use client";

import { useEffect, useState } from "react";

// Vrai quand un champ texte de la page a le focus (clavier à l'écran).
//
// Appli native : Capacitor redimensionne le <body> à l'ouverture du clavier
// (capacitor.config.ts, Keyboard.resize "body"), donc tout ce qui est en
// position fixe en bas — barre de repos, nav du bas — remonte juste
// au-dessus du clavier et recouvre le champ qu'on est en train de remplir
// (retour direct 2026-10-20 : « les notes et le bouton de fin de séance se
// chevauchent »). Pendant la saisie, la séance masque sa barre et pose
// data-ep-typing sur <html>, que globals.css utilise pour masquer la nav du
// bas.

function isTextField(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) {
    const type = el.type;
    return !el.readOnly && !["checkbox", "radio", "range", "file", "button", "submit", "color"].includes(type);
  }
  return (el as HTMLElement).isContentEditable === true;
}

export function useTypingInSession(active: boolean): boolean {
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sync = () => {
      if (timer) clearTimeout(timer);
      // Le focus passe d'un champ à l'autre (charge → reps) : on attend que
      // le nouveau champ ait pris le focus avant de trancher, sinon la barre
      // clignote entre les deux.
      timer = setTimeout(() => setTyping(isTextField(document.activeElement)), 60);
    };
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", sync);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", sync);
      setTyping(false);
    };
  }, [active]);

  useEffect(() => {
    const root = document.documentElement;
    if (typing) root.dataset.epTyping = "1";
    else delete root.dataset.epTyping;
    return () => {
      delete root.dataset.epTyping;
    };
  }, [typing]);

  return active && typing;
}
