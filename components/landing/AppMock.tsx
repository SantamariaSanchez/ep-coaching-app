// Aperçu de l'appli pour l'accueil public : un écran « Aujourd'hui » dessiné
// en CSS avec les couleurs du thème (aucune image à télécharger, il suit donc
// le mode clair/sombre et l'accent). Données d'exemple, annoncées comme telles :
// jamais de faux client ni de faux chiffre de résultats.

export default function AppMock() {
  return (
    <div className="lp-mock" aria-hidden="true">
      <div className="lp-mock-main">
        <div className="lp-mock-row">
          <span className="lp-mock-label">Ta journée</span>
          <span className="lp-mock-link">Agenda</span>
        </div>
        <div className="lp-mock-bar">
          <i style={{ left: "4%", width: "9%" }} />
          <i style={{ left: "38%", width: "10%", background: "var(--ep-warn)" }} />
          <i style={{ left: "62%", width: "14%", background: "var(--ep-accent)" }} />
          <i style={{ left: "82%", width: "9%", background: "var(--ep-violet)" }} />
          <b style={{ left: "55%" }} />
        </div>
        <p className="lp-mock-kicker">À venir · dans 40 min</p>
        <p className="lp-mock-title">Séance : Push</p>
        <p className="lp-mock-meta">6 exercices · ≈ 1 h 10</p>
        <div className="lp-mock-cta">Démarrer la séance</div>
      </div>

      <div className="lp-mock-card lp-mock-nutri">
        <span className="lp-mock-label">Nutrition</span>
        <p className="lp-mock-num">1 450 <small>/ 2 600 kcal</small></p>
        <div className="lp-mock-meter"><i style={{ width: "56%" }} /></div>
        <div className="lp-mock-meter lp-mock-meter--ok"><i style={{ width: "54%" }} /></div>
      </div>

      <div className="lp-mock-card lp-mock-chat">
        <span className="lp-mock-label">Ton coach</span>
        <p className="lp-mock-msg">Beau travail cette semaine. On garde le même volume, et on monte les charges.</p>
      </div>

      <p className="lp-mock-note">Exemple d&apos;écran</p>
    </div>
  );
}
