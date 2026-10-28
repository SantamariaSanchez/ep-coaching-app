// Retour direct 2026-09-16 (audit SEO) : cette page (l'accueil, destination
// du lien en bio Instagram depuis le 2026-08-17, voir CROISSANCE.md) était
// en "use client" sans la moindre raison (aucun hook, aucun état, aucun
// gestionnaire d'événement dans tout le fichier) — juste assez pour
// empêcher tout `export const metadata`, donc aucun titre/description pour
// LA page la plus importante du site côté SEO. Même bug déjà corrigé une
// fois sur app/outils/page.tsx (2026-08-16). InstallAppHint et
// NewsletterSignupForm restent "use client" eux-mêmes, un parent serveur
// peut les rendre sans problème.
import type { Metadata } from "next";
import Link from "next/link";
import { EPLogo } from "@/components/ui/EPLogo";
import InstallAppHint from "@/components/ui/InstallAppHint";
import NewsletterSignupForm from "@/components/newsletter/NewsletterSignupForm";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import AppMock from "@/components/landing/AppMock";
import DemoTabs from "@/components/landing/DemoTabs";
import { COACH_PLATFORM_PLANS, COACH_PLAN_DETAILS, COACH_TESTER_PLAN } from "@/lib/coach-platform-plan";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/brand-links";
import { entityGraph, faqNode, SHOWCASE_URL } from "@/lib/seo-entity";
import "./landing.css";

const TITLE = "EP Coaching : coach sportif à Annecy et en ligne, appli musculation et nutrition";
const DESCRIPTION =
  "EP Coaching, coaching sportif en musculation et nutrition fondé à Annecy par Emmanuel Santamaria Sanchéz : programme sur mesure, plan alimentaire, bilans et suivi dans l'appli, partout en France. Gratuit pour commencer.";

// Sans openGraph/twitter dédiés ici, un partage de la page d'accueil (lien
// en bio Instagram, la destination la plus partagée du site) retombait sur
// l'aperçu générique du layout racine plutôt que ce titre/description
// spécifiques, faute de fusion champ par champ par Next (voir le même
// correctif sur app/ressources/[slug]/page.tsx, 2026-09-16).
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Ordre pensé comme un argumentaire, pas une simple liste alphabétique de
// modules (retour direct du 2026-08-15 : "le gars qui vient veut une
// transformation, les gros points à mettre en avant c'est la formation et
// l'accompagnement, y'a aussi les audits" — "programme nutrition" seul ne
// vend rien, un vrai humain derrière et un vrai parcours, si). Coaching
// live/audits et formations en tête, le reste (outils de suivi au
// quotidien) ensuite : ce sont des modules réels et utiles, juste pas ce
// qui fait venir quelqu'un.
const FEATURES = [
  { title: "Coaching live", desc: "1:1, audits, suivi hebdo, ateliers, webinaires, Q&A" },
  // Pas de "5 formations complètes" (audit de cohérence 2026-09-01) : aucune
  // n'est publiée, on annonce le statut réel ("à venir").
  { title: "Formations (à venir)", desc: "Bodybuilding, nutrition, training, business, psychologie" },
  { title: "Messagerie coach", desc: "Contact direct, réponses personnalisées" },
  { title: "Suivi & progression", desc: "Mesures, photos, pesée, courbes d'évolution" },
  { title: "Programmes", desc: "Plans de musculation sur mesure, adaptés à ton niveau" },
  { title: "Nutrition", desc: "Plans alimentaires et calcul de macros personnalisé" },
  { title: "Logbook séances", desc: "Enregistre tes performances en temps réel" },
  { title: "Tracker quotidien", desc: "Pas, sommeil, biométrie au jour le jour" },
  { title: "Communauté", desc: "Échange avec des membres aussi motivés que toi" },
  { title: "Science & recherche", desc: "Études et actualité sourcées, sans blabla" },
  { title: "Road map", desc: "Tes objectifs et les étapes pour les atteindre" },
  { title: "Recettes", desc: "Des idées de repas healthy et gourmands" },
];

// JSON-LD (retour direct 2026-09-17 : "je veux que quand on cherche mon
// nom ou EP Coaching sur Google, on ressorte en haut") : rien n'associait
// jusqu'ici "Emmanuel Santamaria Sanchéz" à "EP Coaching" pour les moteurs de
// recherche, ni en donnée structurée ni même dans le texte visible de
// cette page (le nom n'apparaissait nulle part). sameAs pointe uniquement
// vers des profils réels et confirmés (Instagram, TikTok, YouTube) —
// jamais une URL LinkedIn inventée, aucune URL vanity confirmée à ce jour
// (voir 🎥 Guide production scripts YouTube).
// Graphe d'entité (entreprise à Annecy, fondateur, site, appli) : voir lib/seo-entity.ts.

// FAQPage (retour direct 2026-09-18 : "travaille sur le GEO, pour qu'on soit
// sûr d'apparaître dans les résultats de recherche de l'IA") — les moteurs
// génératifs (ChatGPT, Perplexity, AI Overviews, Gemini...) citent en
// priorité du contenu structuré en question/réponse direct et factuel,
// contrairement au SEO classique qui se contente de mots-clés. Chaque
// réponse ci-dessous reprend UNIQUEMENT des faits déjà établis ailleurs dans
// cette même page (FEATURES, DESCRIPTION, liens) ou vérifiés en base
// (0 formation publiée à ce jour, voir le commentaire sur FEATURES) — jamais
// un chiffre ou une promesse inventée pour l'occasion. Affiché en texte
// visible ci-dessous (pas seulement en JSON-LD cette page) : Google et les
// moteurs IA pénalisent/ignorent des données structurées qui ne
// correspondent à aucun contenu réellement visible sur la page.
const FAQS = [
  {
    q: "Qu'est-ce qu'EP Coaching ?",
    a: "EP Coaching est un coaching sportif en ligne (bodybuilding, nutrition, performance) : accompagnement live, audits, suivi quotidien, programmes personnalisés et communauté, fondé par Emmanuel Santamaria Sanchéz.",
  },
  {
    q: "Est-ce qu'EP Coaching est gratuit ?",
    a: "Oui, l'accès à EP Coaching est gratuit dès l'inscription, sans engagement.",
  },
  {
    q: "Qui est Emmanuel Santamaria Sanchéz ?",
    a: "Emmanuel Santamaria Sanchéz est le fondateur d'EP Coaching, coach en musculation et nutrition basé à Annecy, athlète naturel (objectif Heroes Cup WNBF France en Classic Physique) et coach pour les coachs.",
  },
  {
    q: "Où est basé EP Coaching ?",
    a: "EP Coaching est basé à Annecy, en Haute-Savoie. L'accompagnement se fait en ligne dans l'appli EP Coaching, donc à Annecy comme partout en France.",
  },
  {
    q: "Qu'est-ce qui est inclus dans EP Coaching ?",
    a: `EP Coaching inclut ${FEATURES.filter((f) => !f.title.includes("à venir")).map((f) => f.title.toLowerCase()).join(", ")}.`,
  },
  {
    q: "EP Coaching existe-t-il pour les coachs sportifs ?",
    a: "Oui. Un coach suit ses propres clients dans l'appli EP Coaching : accès gratuit en échange de ses retours, ou formule Standard à 20 € par mois et Premium à 200 € par mois, sans engagement et sans limite de clients.",
  },
  {
    q: "Comment rejoindre EP Coaching ?",
    a: "L'inscription se fait directement depuis la page d'accueil d'EP Coaching, en quelques secondes et sans carte bancaire.",
  },
] as const;

const STRUCTURED_DATA = entityGraph([faqNode(FAQS)]);


const BENEFITS = [
  { n: "01", t: "Un programme fait pour toi", d: "Séances, exercices et progression adaptés à ton niveau, ton matériel et le temps que tu as. Tu sais quoi faire en ouvrant l'appli." },
  { n: "02", t: "Une nutrition qui se calcule", d: "Tes cibles de calories et de protéines, ton plan alimentaire, le prochain repas : plus de calculs à la main." },
  { n: "03", t: "Un suivi en deux minutes", d: "Bilan du jour, poids lissé, photos, mesures. Tu vois si ça avance, et ton coach aussi." },
  { n: "04", t: "Ton coach, dans la même appli", d: "Messagerie, check-in de la semaine, retours personnalisés. Un vrai humain derrière, pas un robot." },
  { n: "05", t: "Comprendre, pas juste suivre", d: "Guides et études sourcés, expliqués simplement. Tu comprends chaque choix au lieu de copier un plan." },
  { n: "06", t: "Une communauté qui avance", d: "Victoires, questions, classement : des membres aussi motivés que toi, sans pression." },
] as const;

const PLAN_PICKS = { standard: [0, 1, 2], premium: [0, 3, 4] } as const;

function GoogleAppleCta({ coach = false }: { coach?: boolean }) {
  return (
    <div className="lp-cta">
      <SocialAuthButtons role={coach ? "coach" : "client"} layout="stack" className="lp-social" />
      <div className="lp-email">
        <Link href={coach ? "/auth/coach" : "/auth/client"} className="lp-btn lp-btn--ghost" style={{ width: "100%" }}>
          Continuer avec un e-mail
        </Link>
      </div>
      <p className="lp-micro">
        En continuant, tu acceptes les <Link href="/legal/cgu">CGU</Link> et la{" "}
        <Link href="/legal/confidentialite">politique de confidentialité</Link>.
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="lp">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />

      {/* ── En-tête : logo + connexion au téléphone, navigation complète sur ordinateur ── */}
      <header className="lp-header">
        <div className="lp-wrap lp-header-in">
          <Link href="/" className="lp-logo" aria-label="EP Coaching, accueil">
            <EPLogo size="sm" showCoaching={false} />
          </Link>
          <nav className="lp-nav" aria-label="Sections">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#demo">Démo</a>
            <a href="#coachs">Pour les coachs</a>
            <a href="#faq">Questions</a>
          </nav>
          <div className="lp-header-actions">
            <Link href="/auth/client?mode=login" className="lp-link">Se connecter</Link>
            <Link href="/auth/client" className="lp-btn lp-btn--primary lp-btn--sm lp-header-cta">Commencer gratuitement</Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero : un écran, une promesse, trois façons d'entrer ── */}
        <section className="lp-wrap lp-hero" aria-labelledby="lp-h1">
          <div className="lp-hero-visual animate-fade-up">
            <AppMock />
          </div>
          <div className="lp-hero-copy">
            <h1 id="lp-h1" className="lp-h1 animate-fade-up">
              Ton coach, ton programme et ta nutrition. <span>Dans une seule appli.</span>
            </h1>
            <p className="lp-sub animate-fade-up stagger-1">
              Séances, repas, bilans et messages au même endroit, construits sur ta situation. Gratuit pour commencer, sans carte bancaire.
            </p>
            <div className="animate-fade-up stagger-2">
              <GoogleAppleCta />
            </div>
            <p className="lp-already">
              Déjà un compte ? <Link href="/auth/client?mode=login">Se connecter</Link>
            </p>
            <ul className="lp-proof">
              <li>Fondée à Annecy par Emmanuel Santamaria Sanchéz</li>
              <li>iPhone, Android et ordinateur</li>
            </ul>
            <Link href="/auth/coach" className="lp-coach-link">Tu es coach ? Ouvre ton espace gratuit</Link>
          </div>
        </section>

        {/* ── Ce que tu y trouves ── */}
        <section id="fonctionnalites" className="lp-wrap lp-section" aria-labelledby="lp-feat">
          <div className="lp-reveal">
            <p className="lp-eyebrow">Ce que tu y trouves</p>
            <h2 id="lp-feat" className="lp-h2">Tout ce qu&apos;il faut pour progresser, au même endroit</h2>
            <p className="lp-lead">
              Tu t&apos;entraînes, tu fais attention à ce que tu manges, et les résultats ne suivent pas ? Ici tu comprends chaque choix, et ton suivi se construit sur ta situation. Pas une appli de plus.
            </p>
          </div>
          <div className="lp-bento">
            {BENEFITS.map((b) => (
              <article key={b.n} className="lp-card lp-reveal">
                <div className="lp-card-n" aria-hidden="true">{b.n}</div>
                <h3>{b.t}</h3>
                <p>{b.d}</p>
              </article>
            ))}
          </div>
          <p className="lp-lead" style={{ marginTop: 18, marginBottom: 0, fontSize: 14 }}>
            Et aussi : {FEATURES.filter((f) => ["Coaching live", "Logbook séances", "Tracker quotidien", "Road map", "Recettes"].includes(f.title)).map((f) => f.title.toLowerCase()).join(", ")}. Les formations arrivent bientôt.
          </p>
        </section>

        {/* ── Démonstration ── */}
        <section id="demo" className="lp-wrap lp-section" aria-labelledby="lp-demo">
          <div className="lp-reveal">
            <p className="lp-eyebrow">En vrai, ça donne quoi</p>
            <h2 id="lp-demo" className="lp-h2">Une journée dans l&apos;appli</h2>
            <p className="lp-lead">Quatre écrans, un par moment de ta journée. Tu ouvres, tu sais quoi faire.</p>
          </div>
          <div className="lp-reveal"><DemoTabs /></div>
        </section>

        {/* ── Pour les coachs : les offres réelles, depuis la source unique ── */}
        <section id="coachs" className="lp-wrap lp-section" aria-labelledby="lp-coach">
          <div className="lp-reveal">
            <p className="lp-eyebrow">Pour les coachs</p>
            <h2 id="lp-coach" className="lp-h2">Tu es coach ? Suis tous tes clients au même endroit</h2>
            <p className="lp-lead">
              Gratuit pour les membres. Pour les coachs : un accès gratuit en échange de tes retours, ou une formule sans engagement et sans limite de clients.
            </p>
          </div>
          <div className="lp-plans">
            <article className="lp-plan lp-reveal">
              <h3>{COACH_TESTER_PLAN.label}</h3>
              <p className="lp-price">0 € <small>/ mois</small></p>
              <p>{COACH_TESTER_PLAN.sublabel}.</p>
              <ul>
                <li>Suivi de tes clients dans l&apos;appli</li>
                <li>Clients illimités</li>
                <li>Sans carte bancaire</li>
              </ul>
              <Link href="/auth/coach" className="lp-btn lp-btn--ghost">Ouvrir mon espace coach</Link>
            </article>
            {COACH_PLATFORM_PLANS.map((plan) => {
              const d = COACH_PLAN_DETAILS[plan.id];
              const picks = PLAN_PICKS[plan.id].map((n) => d.includes[n]?.title).filter(Boolean);
              const hi = plan.id === "premium";
              return (
                <article key={plan.id} className={`lp-plan lp-reveal${hi ? " lp-plan--hi" : ""}`}>
                  {d.badge && <span className="lp-badge">{d.badge}</span>}
                  <h3>{plan.label}</h3>
                  <p className="lp-price">{plan.amount} € <small>/ mois</small></p>
                  <p>{d.promise}</p>
                  <ul>
                    {d.includesIntro && <li>{d.includesIntro.replace(/\s*:\s*$/, "")}</li>}
                    {picks.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                  <Link href="/auth/coach" className={`lp-btn ${hi ? "lp-btn--primary" : "lp-btn--ghost"}`}>{d.ctaLabel}</Link>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── Qui et où (SEO/GEO) ── */}
        <section className="lp-wrap lp-section" aria-labelledby="lp-founder">
          <div className="lp-founder lp-reveal">
            <h2 id="lp-founder">Fondé à Annecy par Emmanuel Santamaria Sanchéz</h2>
            <p>
              Coach en musculation et nutrition, athlète naturel. EP Coaching est né à Annecy, en Haute-Savoie, et accompagne en ligne partout en France : programme, nutrition, bilans et messages, dans une seule appli.
            </p>
            <div className="lp-founder-links">
              <Link href="/a-propos">Qui suis-je →</Link>
              <Link href="/coach-sportif-annecy">Coach sportif à Annecy →</Link>
              <Link href="/coachs">Voir qui va t&apos;accompagner →</Link>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram @{INSTAGRAM_HANDLE} →</a>
            </div>
          </div>
        </section>

        {/* ── FAQ : texte visible identique au JSON-LD FAQPage ── */}
        <section id="faq" className="lp-wrap lp-section" aria-labelledby="lp-faq">
          <div className="lp-reveal">
            <p className="lp-eyebrow">Questions fréquentes</p>
            <h2 id="lp-faq" className="lp-h2">Tout ce qu&apos;on te demande avant de commencer</h2>
          </div>
          <div className="lp-faq">
            {FAQS.map(({ q, a }) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Appel final ── */}
        <section className="lp-wrap lp-section" aria-labelledby="lp-final">
          <div className="lp-final lp-reveal">
            <h2 id="lp-final" className="lp-h2" style={{ marginBottom: 6 }}>Prêt à commencer ?</h2>
            <p className="lp-lead" style={{ margin: "0 auto" }}>Gratuit, sans engagement, en moins d&apos;une minute.</p>
            <GoogleAppleCta />
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-grid">
          <div>
            <EPLogo size="sm" showCoaching />
            <p className="lp-legal" style={{ marginTop: 18 }}>
              EP Coaching · Fondé par Emmanuel Santamaria Sanchéz · Coaching musculation et nutrition
            </p>
            <nav aria-label="Plus sur EP Coaching" style={{ marginTop: 10 }}>
              <Link href="/a-propos">À propos</Link>
              <Link href="/coach-sportif-annecy">Coach sportif à Annecy</Link>
              <Link href="/ressources">Guides gratuits</Link>
              <Link href="/outils">Calculateurs</Link>
              <Link href="/coachs">Les coachs</Link>
              <Link href="/carrieres">Carrières</Link>
              <a href={SHOWCASE_URL} target="_blank" rel="noopener">Le site EP Coaching</a>
            </nav>
            <nav aria-label="Informations légales">
              <Link href="/legal/cgu">CGU</Link>
              <Link href="/legal/cgv">CGV</Link>
              <Link href="/legal/confidentialite">Confidentialité</Link>
            </nav>
          </div>
          <div>
            <NewsletterSignupForm source="app_home" />
            <InstallAppHint />
          </div>
        </div>
      </footer>
    </div>
  );
}
