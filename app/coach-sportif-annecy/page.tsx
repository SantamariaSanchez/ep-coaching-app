import type { Metadata } from "next";
import Link from "next/link";
import PublicPage, { Section, FaqList } from "@/components/public/PublicPage";
import { entityGraph, faqNode, breadcrumbNode, PLACE, SITE_URL } from "@/lib/seo-entity";

// Page locale (SEO/GEO 2026-10-13) : « coach sportif Annecy », « coaching
// musculation Annecy », « coach nutrition Annecy ». Uniquement des faits :
// l'accompagnement se fait en ligne, EP Coaching est basé à Annecy.

const TITLE = "Coach sportif à Annecy : musculation et nutrition | EP Coaching";
const DESCRIPTION =
  "Coach sportif basé à Annecy : programme de musculation sur mesure, plan nutrition, bilans chaque semaine et messages avec ton coach dans l'appli EP Coaching. Annecy, Seynod, Annecy-le-Vieux et partout en France.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/coach-sportif-annecy" },
  openGraph: { url: "/coach-sportif-annecy", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQS = [
  {
    q: "Y a-t-il un coach sportif EP Coaching à Annecy ?",
    a: "Oui. EP Coaching est basé à Annecy et fondé par Emmanuel Santamaria Sanchéz, coach en musculation et nutrition. L'accompagnement se fait dans l'appli EP Coaching, avec des appels vidéo.",
  },
  {
    q: "Le coaching se fait-il en présentiel ou en ligne ?",
    a: "En ligne : ton programme, ta nutrition, tes bilans et tes messages passent par l'appli, où que tu t'entraînes (salle d'Annecy, à la maison ou en déplacement).",
  },
  {
    q: "Pour quels objectifs ?",
    a: "Prise de muscle, perte de gras, recomposition, reprise du sport, préparation d'une compétition de bodybuilding naturel, ou simplement progresser avec un plan clair.",
  },
  {
    q: "Combien de temps pour démarrer ?",
    a: "Tu crées ton compte gratuit en moins d'une minute, tu remplis ton questionnaire de départ (objectif, disponibilités, matériel de ta salle), et ton coach construit ton programme.",
  },
  {
    q: "Je ne suis pas à Annecy, c'est possible ?",
    a: "Oui, tout se fait dans l'appli : le suivi est le même partout en France et à l'étranger.",
  },
] as const;

export default function CoachAnnecyPage() {
  return (
    <PublicPage
      eyebrow="Annecy, Haute-Savoie"
      title="Coach sportif à Annecy, en musculation et nutrition"
      intro="Un vrai coach qui lit tes bilans et ajuste ton programme, basé à Annecy, et toute ta préparation dans une appli : entraînement, nutrition, progrès."
      jsonLd={entityGraph([
        {
          "@type": "Service",
          name: "Coaching sportif en musculation et nutrition à Annecy",
          serviceType: "Coaching sportif",
          provider: { "@id": `${SITE_URL}/#entreprise` },
          areaServed: [{ "@type": "City", name: "Annecy" }, ...PLACE.around.map((n) => ({ "@type": "City", name: n })), { "@type": "Country", name: "France" }],
          url: `${SITE_URL}/coach-sportif-annecy`,
        },
        breadcrumbNode([
          { name: "Accueil", path: "/" },
          { name: "Coach sportif à Annecy", path: "/coach-sportif-annecy" },
        ]),
        faqNode(FAQS),
      ])}
    >
      <Section title="Ce que tu as concrètement">
        <ul style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>Un programme de musculation construit pour toi, selon ton objectif, ton niveau et les machines de ta salle.</li>
          <li>Un plan nutrition que tu peux tenir, avec les aliments que tu aimes.</li>
          <li>Un bilan chaque semaine : ton coach regarde tes chiffres, tes photos et ton ressenti, puis ajuste.</li>
          <li>Les messages avec ton coach et des appels quand tu en as besoin.</li>
          <li>Ta séance guidée dans l&apos;appli : charges, reps, repos, records.</li>
        </ul>
      </Section>
      <Section title="Basé à Annecy, disponible partout">
        <p>
          EP Coaching est né à Annecy. Que tu t&apos;entraînes à {PLACE.around.slice(0, 5).join(", ")}, ailleurs en Haute-Savoie ou
          dans le reste de la France, le suivi est le même : tout se passe dans l&apos;appli, à ton rythme et sur tes horaires.
        </p>
      </Section>
      <Section title="Qui va t'accompagner">
        <p>
          Emmanuel Santamaria Sanchéz, coach en musculation et nutrition, athlète naturel.{" "}
          <Link href="/a-propos" style={{ color: "var(--ep-accent)", fontWeight: 700 }}>
            Son parcours et sa méthode
          </Link>
          .
        </p>
      </Section>
      <Section title="Questions fréquentes">
        <FaqList faqs={FAQS} />
      </Section>
    </PublicPage>
  );
}
