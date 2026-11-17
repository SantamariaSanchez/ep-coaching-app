// Retour direct 2026-09-16 (audit SEO) : cette page (l'accueil, destination
// du lien en bio Instagram depuis le 2026-08-17, voir CROISSANCE.md) était
// en "use client" sans la moindre raison (aucun hook, aucun état, aucun
// gestionnaire d'événement dans tout le fichier) — juste assez pour
// empêcher tout `export const metadata`, donc aucun titre/description pour
// LA page la plus importante du site côté SEO. Même bug déjà corrigé une
// fois sur app/outils/page.tsx (2026-08-16). InstallAppHint et
// NewsletterSignupForm restent "use client" eux-mêmes, un parent serveur
// peut les rendre sans problème.
import StandaloneRedirect from "@/components/landing/StandaloneRedirect";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { EPLogo } from "@/components/ui/EPLogo";
import InstallAppHint from "@/components/ui/InstallAppHint";
import NewsletterSignupForm from "@/components/newsletter/NewsletterSignupForm";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import AppMock from "@/components/landing/AppMock";
import { COACH_PLATFORM_PLANS, COACH_PLAN_DETAILS, COACH_TESTER_PLAN } from "@/lib/coach-platform-plan";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/brand-links";
import { entityGraph, faqNode, SHOWCASE_URL } from "@/lib/seo-entity";
import { FREE_TIER_DAYS } from "@/lib/free-tier";
import "./landing.css";

const TITLE = "EP Coaching : coach sportif à Annecy et en ligne, appli musculation et nutrition";
const DESCRIPTION =
  "EP Coaching aide les débutantes à perdre du gras et atteindre leurs objectifs en 6 mois : programme sur mesure, alimentation sans privation, check-in chaque semaine et suivi dans l'appli. 60 jours gratuits, audit offert.";

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
  { title: "Formations (à venir)", desc: "Nutrition, entraînement, régularité" },
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
    a: `Oui, l'accès à EP Coaching est gratuit pendant ${FREE_TIER_DAYS} jours dès l'inscription, sans engagement et sans carte bancaire. Ensuite, l'accès continue avec un accompagnement.`,
  },
  {
    q: "Qui est Emmanuel Santamaria Sanchéz ?",
    a: "Emmanuel Santamaria Sanchéz est le fondateur d'EP Coaching, coach sportif de 17 ans né à Girardota en Colombie, basé à Annecy et bientôt à Paris. Il aide les débutantes à perdre du gras en 6 mois et prépare la WNBF Classic 2027.",
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
  { n: "01", t: "Un programme fait pour toi", d: "Adapté à ton niveau, ton matériel et ton temps." },
  { n: "02", t: "Une nutrition calculée", d: "Calories, protéines et repas prévus pour toi." },
  { n: "03", t: "Un suivi en deux minutes", d: "Bilan du jour, poids, photos, mesures." },
  { n: "04", t: "Ton coach dans l'appli", d: "Messages et check-in chaque semaine." },
  { n: "05", t: "Tu comprends chaque choix", d: "Des guides simples, expliqués pour débuter." },
  { n: "06", t: "Une communauté qui avance", d: "Victoires et questions, sans pression." },
] as const;

const PLAN_PICKS = { standard: [0, 1, 2], premium: [0, 3, 4] } as const;

const AUDIT_URL = "https://calendly.com/peccoux-manu/audit-strategique";

// Page Cible (Notion) : ce qu'elle vit, dit avec ses mots.
const FOR_YOU = [
  "La salle t'intimide",
  "Tu veux perdre du ventre",
  "Tu manques de temps",
  "Un écart, et tout est gâché",
] as const;

const MYTHS = [
  { faux: "Des heures de cardio", vrai: "La musculation dessine tes formes." },
  { faux: "Trop musclée", vrai: "Des fessiers, des épaules, une silhouette équilibrée." },
  { faux: "Manger très peu", vrai: "Tu manges à ta faim." },
] as const;

// Comment ça marche (façon Calendly) : trois étapes, rien de plus.
const STEPS = [
  { n: "1", t: "Crée ton compte", d: "Gratuit 60 jours, sans carte." },
  { n: "2", t: "Réponds à quelques questions", d: "Ton objectif, ton temps, ton matériel." },
  { n: "3", t: "Suis ton plan du jour", d: "Séance, repas, bilan." },
] as const;

// Écrans réels de l'appli (comptes de démonstration, données d'exemple).
const ROWS = [
  { img: "entrainement", alt: "Écran Mon programme de l'appli EP Coaching", kicker: "Entraînement", t: "La séance du jour, prête à lancer", d: "Tu notes chaque série, ton logbook se remplit tout seul.", pts: ["Adapté à ton niveau", "Exercices expliqués"] },
  { img: "nutrition", alt: "Écran Nutrition de l'appli EP Coaching", kicker: "Nutrition", t: "Manger à ta faim, et perdre du gras", d: "Des repas que tu aimes déjà, calculés pour toi.", pts: ["Pas besoin de tout peser", "Un repas raté ? Le suivant s'adapte"] },
  { img: "road-map", alt: "Écran Road Map de l'appli EP Coaching", kicker: "Roadmap", t: "Six mois, découpés en étapes", d: "Tu sais où tu en es et ce qui vient ensuite.", pts: ["Tendance sur plusieurs semaines", "Ajustée à chaque check-in"] },
  { img: "messages", alt: "Écran Messages avec le coach dans l'appli EP Coaching", kicker: "Ton coach", t: "Quelqu'un te répond, vraiment", d: "Check-in chaque semaine, corrections en vidéo.", pts: ["Réponse à toute heure"] },
] as const;

function GoogleAppleCta({ coach = false }: { coach?: boolean }) {
  return (
    <div className="lp-cta">
      <SocialAuthButtons role={coach ? "coach" : "client"} layout="stack" className="lp-social" />
      <div className="lp-email">
        <Link href={coach ? "/auth/coach" : "/auth/client"} className="lp-btn lp-btn--primary" style={{ width: "100%" }}>
          Commencer gratuitement
        </Link>
      </div>
      <p className="lp-micro">
        En continuant, tu acceptes les <Link href="/legal/cgu">CGU</Link> et la{" "}
        <Link href="/legal/confidentialite">politique de confidentialité</Link>.
      </p>
    </div>
  );
}

export default async function HomePage() {
  return (
    <div className="lp">
      <StandaloneRedirect />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />

      {/* ── En-tête : logo + connexion au téléphone, navigation complète sur ordinateur ── */}
      <header className="lp-header">
        <div className="lp-wrap lp-header-in">
          <Link href="/" className="lp-logo" aria-label="EP Coaching, accueil">
            <EPLogo size="sm" showCoaching={false} />
          </Link>
          <nav className="lp-nav" aria-label="Sections">
            <a href="#comment">Comment ça marche</a>
            <a href="#demo">L&apos;appli</a>
            <a href="#coaching">Coaching</a>
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
        {/* ── Hero (2026-11-17, inspiré Notion / Calendly) : une promesse centrée,
            deux actions claires, puis la vitrine de l'appli avec de vrais écrans.
            Téléphone : la colonne d'entrée (Google, Apple, e-mail) reste la même. ── */}
        <section className="lp-wrap lp-hero" aria-labelledby="lp-h1">
          <div className="lp-hero-visual animate-fade-up">
            <AppMock />
          </div>
          <div className="lp-hero-copy">
            <p className="lp-pill animate-fade-up">Coaching 6 mois · Appli de suivi · Annecy</p>
            <h1 id="lp-h1" className="lp-h1 animate-fade-up">
              {["Perds", "du", "gras", "et", "atteins", "tes", "objectifs", "en", "6\u00a0mois."].map((w, k) => (
                <span key={k} className="lp-w" style={{ ["--k" as string]: k }}><span>{w}</span></span>
              ))}
              <span>Même si tu pars de zéro.</span>
            </h1>
            <p className="lp-sub animate-fade-up stagger-1">
              Pour les débutantes qui veulent aimer leur corps et le développer. Un programme qui tient dans ta semaine, une alimentation sans privation, et un coach qui ajuste avec toi.
            </p>
            <div className="lp-hero-actions animate-fade-up stagger-2">
              <Link href="/auth/client" className="lp-btn lp-btn--primary lp-btn--lg">Commencer gratuitement</Link>
              <a href={AUDIT_URL} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn--ghost lp-btn--lg">Réserver mon audit offert</a>
            </div>
            <p className="lp-hero-note animate-fade-up stagger-2">60 jours gratuits · sans carte bancaire · audit de 30 min en tête-à-tête</p>
            <div className="lp-hero-mobile animate-fade-up stagger-2">
              <GoogleAppleCta />
              <p className="lp-already">
                <a href={AUDIT_URL} target="_blank" rel="noopener noreferrer">Réserver mon audit gratuit de 30 minutes</a>
              </p>
              <p className="lp-already">
                Déjà un compte ? <Link href="/auth/client?mode=login">Se connecter</Link>
              </p>
              <Link href="/auth/coach" className="lp-coach-link">Tu es coach ? Ouvre ton espace gratuit</Link>
            </div>
          </div>
        </section>

        {/* ── Vitrine : trois vrais écrans (ordinateur) ── */}
        <section className="lp-wrap lp-showcase" aria-label="Aperçu de l'appli EP Coaching">
          <figure className="lp-shot lp-shot--l"><Image sizes="320px" src="/landing/nutrition.webp" alt="Écran Nutrition de l'appli EP Coaching" width={780} height={1328} loading="lazy" /></figure>
          <figure className="lp-shot lp-shot--c"><Image sizes="320px" src="/landing/aujourdhui.webp" alt="Écran Aujourd'hui de l'appli EP Coaching" width={780} height={1328} priority /></figure>
          <figure className="lp-shot lp-shot--r"><Image sizes="320px" src="/landing/road-map.webp" alt="Écran Road Map de l'appli EP Coaching" width={780} height={1328} loading="lazy" /></figure>
          <p className="lp-shot-note">Écrans réels de l&apos;appli, comptes de démonstration.</p>
        </section>

        {/* ── Comment ça marche ── */}
        <section id="comment" className="lp-wrap lp-section" aria-labelledby="lp-how">
          <div className="lp-center lp-reveal">
            <h2 id="lp-how" className="lp-h2">Trois étapes, et tu sais quoi faire</h2>
          </div>
          <ol className="lp-steps">
            {STEPS.map((s) => (
              <li key={s.n} className="lp-step lp-reveal">
                <span className="lp-step-n" aria-hidden="true">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── C'est pour toi si… (page Cible, Notion) ── */}
        <section id="pour-toi" className="lp-wrap lp-section" aria-labelledby="lp-foryou">
          <div className="lp-foryou lp-reveal">
            <div>
              <h2 id="lp-foryou" className="lp-h2">Tu as déjà commencé. Plusieurs fois.</h2>
              <p className="lp-lead">Une semaine chargée, et tout s&apos;arrête.</p>
            </div>
            <ul className="lp-checks">
              {FOR_YOU.map((x, i) => <li key={x} style={{ ["--i" as string]: i }}>{x}</li>)}
            </ul>
          </div>
        </section>

        {/* ── Ce qu'on t'a fait croire ── */}
        <section className="lp-wrap lp-section" aria-labelledby="lp-myths">
          <div className="lp-center lp-reveal">
            <h2 id="lp-myths" className="lp-h2">Trois idées fausses</h2>
          </div>
          <div className="lp-myths">
            {MYTHS.map((m) => (
              <article key={m.faux} className="lp-myth lp-reveal">
                <p className="lp-myth-faux"><s>{m.faux}</s></p>
                <p className="lp-myth-vrai">{m.vrai}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Ce que tu y trouves ── */}
        <section id="fonctionnalites" className="lp-wrap lp-section" aria-labelledby="lp-feat">
          <div className="lp-reveal">
            <h2 id="lp-feat" className="lp-h2">Tout au même endroit</h2>
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

        {/* ── L'appli, écran par écran (façon Glasp / Notion) ── */}
        <section id="demo" className="lp-wrap lp-section" aria-labelledby="lp-demo">
          <div className="lp-center lp-reveal">
            <h2 id="lp-demo" className="lp-h2">Une journée dans l&apos;appli</h2>
          </div>
          <div className="lp-rows">
            {ROWS.map((r, i) => (
              <article key={r.img} className={`lp-row lp-reveal${i % 2 ? " lp-row--rev" : ""}`}>
                <div className="lp-row-text">
                  <h3>{r.t}</h3>
                  <p>{r.d}</p>
                  <ul>{r.pts.map((pt) => <li key={pt}>{pt}</li>)}</ul>
                </div>
                <figure className="lp-row-shot"><Image sizes="330px" src={`/landing/${r.img}.webp`} alt={r.alt} width={780} height={1328} loading="lazy" /></figure>
              </article>
            ))}
          </div>
        </section>

        {/* ── Le coaching 6 mois ── */}
        <section id="coaching" className="lp-wrap lp-section" aria-labelledby="lp-coaching">
          <div className="lp-offer lp-reveal">
            <div>
              <h2 id="lp-coaching" className="lp-h2">Six mois avec un coach</h2>
              <p className="lp-lead">On commence par un audit de 30 minutes, offert.</p>
              <div className="lp-hero-actions lp-hero-actions--left">
                <a href={AUDIT_URL} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn--primary lp-btn--lg">Réserver mon audit offert</a>
              </div>
            </div>
            <ul className="lp-offer-list">
              {["Programme, diète et roadmap faits pour toi", "Un check-in chaque semaine, photos et corrections vidéo", "Un suivi à toute heure", "7 formats de live à réserver", "5 formations", "Toute l'appli EP Coaching"].map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        </section>

        {/* ── Pour les coachs : les offres réelles, depuis la source unique ── */}
        <section id="coachs" className="lp-wrap lp-section" aria-labelledby="lp-coach">
          <div className="lp-reveal">
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
              Coach en musculation et nutrition. EP Coaching est né à Annecy et accompagne en ligne partout en France.
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
            <h2 id="lp-final" className="lp-h2" style={{ marginBottom: 6 }}>Cette fois, on le fait bien</h2>
            <p className="lp-lead" style={{ margin: "0 auto" }}>60 jours gratuits, sans carte. Ou un audit de 30 minutes offert.</p>
            <div className="lp-hero-actions lp-final-desk">
              <Link href="/auth/client" className="lp-btn lp-btn--primary lp-btn--lg">Commencer gratuitement</Link>
              <a href={AUDIT_URL} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn--ghost lp-btn--lg">Réserver mon audit offert</a>
            </div>
            <div className="lp-final-mobile"><GoogleAppleCta /></div>
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
