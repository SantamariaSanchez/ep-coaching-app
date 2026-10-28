"use client";

import { useId, useState } from "react";

// Démonstration : quatre écrans de l'appli (exemples dessinés en CSS), un onglet
// par moment de la journée. Clavier : flèches gauche/droite entre les onglets.

const TABS = [
  { key: "training", label: "Training", title: "La séance du jour, prête à lancer", text: "Ton programme, tes exercices et tes charges précédentes. Tu notes chaque série pendant la séance, le carnet se remplit tout seul." },
  { key: "nutrition", label: "Nutrition", title: "Ce que tu manges, sans prise de tête", text: "Tes cibles de calories et de protéines, le prochain repas et ce qu'il te reste pour la journée." },
  { key: "suivi", label: "Suivi", title: "Tu vois ta progression", text: "Bilan du jour en deux minutes, poids lissé sur la semaine, photos et mesures au même endroit." },
  { key: "coach", label: "Coach", title: "Ton coach, dans la même appli", text: "Messages, check-in de la semaine et retours personnalisés, sans jongler entre trois applis." },
] as const;

function Screen({ k }: { k: (typeof TABS)[number]["key"] }) {
  if (k === "training") {
    return (
      <div className="lp-scr">
        <p className="lp-scr-h">Push · 6 exercices</p>
        {[["Développé couché", "4 × 8", "80 kg"], ["Développé incliné haltères", "3 × 10", "28 kg"], ["Élévations latérales", "4 × 12", "10 kg"], ["Dips", "3 × 8", "poids du corps"]].map(([n, s, w]) => (
          <div key={n} className="lp-scr-line"><span>{n}</span><b>{s}</b><em>{w}</em></div>
        ))}
        <div className="lp-mock-cta">Démarrer la séance</div>
      </div>
    );
  }
  if (k === "nutrition") {
    return (
      <div className="lp-scr">
        <p className="lp-mock-num">1 450 <small>/ 2 600 kcal</small></p>
        <div className="lp-mock-meter"><i style={{ width: "56%" }} /></div>
        <p className="lp-scr-sub">Protéines 98 / 180 g</p>
        <div className="lp-mock-meter lp-mock-meter--ok"><i style={{ width: "54%" }} /></div>
        {[["Petit-déjeuner", "620 kcal", "fait"], ["Déjeuner", "830 kcal", "fait"], ["Dîner", "780 kcal", "à venir"]].map(([n, kc, st]) => (
          <div key={n} className="lp-scr-line"><span>{n}</span><b>{kc}</b><em>{st}</em></div>
        ))}
      </div>
    );
  }
  if (k === "suivi") {
    return (
      <div className="lp-scr">
        <p className="lp-scr-h">Poids, moyenne sur 7 jours</p>
        <svg viewBox="0 0 200 70" className="lp-spark" role="img" aria-label="Courbe de poids d'exemple, en légère hausse">
          <polyline points="0,52 25,50 50,47 75,48 100,42 125,40 150,35 175,33 200,28" fill="none" stroke="var(--ep-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="0,52 25,50 50,47 75,48 100,42 125,40 150,35 175,33 200,28 200,70 0,70" fill="rgba(var(--ep-accent-rgb),0.12)" stroke="none" />
        </svg>
        <div className="lp-scr-line"><span>Bilan du jour</span><b>2 min</b><em>sommeil, énergie, faim</em></div>
        <div className="lp-scr-line"><span>Photos</span><b>face, profil, dos</b><em>comparées</em></div>
      </div>
    );
  }
  return (
    <div className="lp-scr">
      <p className="lp-scr-h">Messages</p>
      <p className="lp-bubble lp-bubble--in">Ton check-in est reçu, bravo pour la régularité.</p>
      <p className="lp-bubble lp-bubble--in">On garde les mêmes séances et on ajuste ta diète de 100 kcal.</p>
      <p className="lp-bubble lp-bubble--out">Ça marche, merci !</p>
    </div>
  );
}

export default function DemoTabs() {
  const id = useId();
  const [i, setI] = useState(0);
  const tab = TABS[i];

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") setI((v) => (v + 1) % TABS.length);
    else if (e.key === "ArrowLeft") setI((v) => (v - 1 + TABS.length) % TABS.length);
    else return;
    e.preventDefault();
  }

  return (
    <div className="lp-demo">
      <div className="lp-demo-tabs" role="tablist" aria-label="Écrans de l'appli" onKeyDown={onKey}>
        {TABS.map((t, n) => (
          <button
            key={t.key}
            role="tab"
            id={`${id}-t-${t.key}`}
            aria-selected={n === i}
            aria-controls={`${id}-p`}
            tabIndex={n === i ? 0 : -1}
            className="lp-demo-tab"
            onClick={() => setI(n)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="lp-demo-body" role="tabpanel" id={`${id}-p`} aria-labelledby={`${id}-t-${tab.key}`}>
        <div className="lp-demo-text">
          <h3>{tab.title}</h3>
          <p>{tab.text}</p>
          <p className="lp-demo-note">Exemple d&apos;écran, avec des données d&apos;illustration.</p>
        </div>
        <div className="lp-phone">
          <Screen k={tab.key} />
        </div>
      </div>
    </div>
  );
}
