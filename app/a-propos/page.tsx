import type { Metadata } from "next";
import Link from "next/link";
import PublicPage, { Section, FaqList } from "@/components/public/PublicPage";
import { entityGraph, faqNode, breadcrumbNode, FOUNDER, SITE_URL } from "@/lib/seo-entity";
import { SANTAMARIA_SOCIALS } from "@/lib/brand-links";

// Page « qui est derrière » (SEO/GEO 2026-10-13) : une recherche du nom du
// fondateur doit tomber ici, pas sur les CGU.

const TITLE = "Emmanuel Santamaria Sanchéz, coach sportif à Annecy et fondateur d'EP Coaching";
const DESCRIPTION =
  "Qui est Emmanuel Santamaria Sanchéz ? Coach en musculation et nutrition basé à Annecy, athlète naturel, fondateur d'EP Coaching : son parcours, sa méthode et ce qu'il construit.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/a-propos" },
  openGraph: { url: "/a-propos", title: TITLE, description: DESCRIPTION, type: "profile" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQS = [
  {
    q: "Qui est Emmanuel Santamaria Sanchéz ?",
    a: `${FOUNDER.name} est coach en musculation et nutrition, basé à Annecy (Haute-Savoie), et le fondateur d'EP Coaching. ${FOUNDER.bio}`,
  },
  {
    q: "Qu'est-ce qu'EP Coaching ?",
    a: "Un accompagnement humain et une appli : programme d'entraînement sur mesure, plan alimentaire, bilans, messages avec ton coach et suivi de tes progrès. L'appli sert aussi aux coachs pour suivre leurs clients.",
  },
  {
    q: "Comment travailler avec Emmanuel Santamaria Sanchéz ?",
    a: "Crée ton compte gratuit dans l'appli EP Coaching, puis demande ton accompagnement depuis l'onglet Coach. Le suivi se fait en ligne, à Annecy comme partout en France.",
  },
] as const;

export default function AProposPage() {
  return (
    <PublicPage
      eyebrow="À propos"
      title="Emmanuel Santamaria Sanchéz, fondateur d'EP Coaching"
      intro="Coach en musculation et nutrition, basé à Annecy. Je prends les gens motivés et je fais en sorte qu'ils aillent plus vite que s'ils étaient seuls."
      jsonLd={entityGraph([
        { "@type": "AboutPage", name: TITLE, url: `${SITE_URL}/a-propos`, about: { "@id": `${SITE_URL}/a-propos#fondateur` } },
        breadcrumbNode([
          { name: "Accueil", path: "/" },
          { name: "À propos", path: "/a-propos" },
        ]),
        faqNode(FAQS),
      ])}
    >
      <Section title="Mon parcours">
        <p>
          Je suis athlète naturel, objectif Heroes Cup WNBF France en Classic Physique. Je m&apos;applique à moi-même ce que je
          transmets : ce que je sais, je l&apos;ai appris en le faisant, et je continue à l&apos;apprendre.
        </p>
      </Section>
      <Section title="Ma méthode">
        <p>
          Un programme construit pour toi, une nutrition que tu peux tenir, et des bilans réguliers pour ajuster sur tes vrais
          résultats. Tu comprends chaque choix au lieu de suivre un plan recopié.
        </p>
      </Section>
      <Section title="EP Coaching, né à Annecy">
        <p>
          EP Coaching est né à Annecy, en Haute-Savoie. Aujourd&apos;hui c&apos;est un accompagnement en ligne et une appli qui
          réunit tout : entraînement, nutrition, bilans, messages avec ton coach. Pour les coachs, la même appli sert à suivre
          leurs clients et à développer leur activité. Si tu es à Annecy ou autour, voir aussi{" "}
          <Link href="/coach-sportif-annecy" style={{ color: "var(--ep-accent)", fontWeight: 700 }}>
            coach sportif à Annecy
          </Link>
          .
        </p>
      </Section>
      <Section title="Ce qu'on ne fera jamais">
        <p>
          Inventer une preuve : aucun témoignage, aucun chiffre, aucune transformation inventée. Remplacer l&apos;humain : tes
          bilans sont lus par un coach qui te répond. Garder tes données : tu peux les exporter ou supprimer ton compte à tout
          moment.
        </p>
      </Section>
      <Section title="Me suivre">
        <p style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {SANTAMARIA_SOCIALS.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer me" style={{ color: "var(--ep-accent)", fontWeight: 700 }}>
              {url.includes("instagram") ? "Instagram" : url.includes("threads") ? "Threads" : url.includes("tiktok") ? "TikTok" : "YouTube"}
            </a>
          ))}
        </p>
      </Section>
      <Section title="Questions fréquentes">
        <FaqList faqs={FAQS} />
      </Section>
    </PublicPage>
  );
}
