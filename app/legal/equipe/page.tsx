import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, P, Ul, Strong, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Conditions de collaboration de l'équipe · EP Coaching",
  alternates: { canonical: "/legal/equipe" },
};

// Équivalent des CGU pour les recrues de l'équipe (espace /equipe), acceptées
// à la création de l'accès puis rappelées à la signature du contrat. Le
// contrat de collaboration de chaque poste (lib/staff-contract.ts) prime en
// cas de différence. Version suivie par STAFF_TERMS_VERSION.
const sections: LegalSection[] = [
  {
    id: "objet",
    title: "1. Objet",
    body: (
      <P>
        Ces conditions encadrent l&apos;accès et l&apos;usage de l&apos;espace équipe d&apos;EP Coaching par les
        personnes recrutées pour l&apos;un des postes de l&apos;organisation (sales, marketing, produit, opérations,
        coaching). Elles complètent le contrat de collaboration signé à la première connexion, qui prime en cas de
        différence.
      </P>
    ),
  },
  {
    id: "acces",
    title: "2. Création et sécurité de l'accès",
    body: (
      <>
        <P>
          L&apos;accès est créé uniquement avec l&apos;adresse email autorisée par EP Coaching pour le poste concerné,
          puis confirmé par email. Il est strictement personnel.
        </P>
        <Ul>
          <li>Le mot de passe n&apos;est jamais partagé, y compris avec un autre membre de l&apos;équipe.</li>
          <li>La double authentification est fortement recommandée dès sa mise à disposition.</li>
          <li>Toute connexion suspecte ou perte d&apos;appareil est signalée sans délai à EP Coaching.</li>
        </Ul>
      </>
    ),
  },
  {
    id: "usage",
    title: "3. Usage de l'espace",
    body: (
      <>
        <P>
          L&apos;espace équipe sert exclusivement à la mission confiée : suivi des prospects, agenda, livrables,
          tickets, rapports de fin de journée et outils propres au poste. Les données saisies appartiennent à EP
          Coaching et restent consultables par le fondateur et, le cas échéant, par le responsable du pôle.
        </P>
        <P>Chaque action est horodatée. Le rapport de fin de journée reflète fidèlement l&apos;activité réelle.</P>
      </>
    ),
  },
  {
    id: "confidentialite",
    title: "4. Confidentialité",
    body: (
      <P>
        Tout ce qui est consulté ou produit dans le cadre de la mission est confidentiel : données des clients et
        membres, chiffres de l&apos;entreprise, méthodes, scripts, contenus non publiés, candidatures. Cette
        obligation continue après la fin de la collaboration, dans les conditions du contrat.
      </P>
    ),
  },
  {
    id: "donnees",
    title: "5. Données personnelles et données de santé",
    body: (
      <>
        <P>
          Les clients d&apos;EP Coaching confient des données sensibles, dont des données de santé au sens de
          l&apos;article 9 du RGPD. Chaque membre de l&apos;équipe n&apos;accède qu&apos;aux données strictement
          nécessaires à son poste.
        </P>
        <Ul>
          <li>Aucune extraction, capture d&apos;écran ou copie de données client hors des outils d&apos;EP Coaching.</li>
          <li>Aucune donnée client collée dans un outil tiers, notamment d&apos;intelligence artificielle, sans accord écrit.</li>
          <li>Tout incident (envoi au mauvais destinataire, perte, fuite) est signalé dans les 24 heures.</li>
        </Ul>
        <P>
          Les données personnelles des membres de l&apos;équipe eux-mêmes (identité, email, activité dans
          l&apos;espace) sont traitées pour la gestion de la collaboration, selon la{" "}
          <Link href="/legal/confidentialite" style={{ color: "#E01E1E", fontWeight: 700 }}>politique de confidentialité</Link>.
        </P>
      </>
    ),
  },
  {
    id: "image",
    title: "6. Image de marque et communication",
    body: (
      <P>
        Aucune prise de parole publique au nom d&apos;EP Coaching sans validation préalable. Les échanges avec les
        prospects et clients restent courtois, honnêtes et fidèles à ce que l&apos;offre contient réellement : aucune
        promesse de résultat, aucune pression commerciale abusive.
      </P>
    ),
  },
  {
    id: "propriete",
    title: "7. Propriété intellectuelle",
    body: (
      <P>
        Les créations réalisées pour EP Coaching dans le cadre de la mission lui sont cédées selon les termes du
        contrat de collaboration. La marque, le logo, les contenus et l&apos;application EP Coaching restent sa
        propriété exclusive.
      </P>
    ),
  },
  {
    id: "fin",
    title: "8. Suspension et fin de l'accès",
    body: (
      <P>
        L&apos;accès peut être suspendu immédiatement en cas de manquement à ces conditions, notamment à la
        confidentialité ou à la protection des données. Il prend fin avec le contrat de collaboration. Les données
        saisies restent la propriété d&apos;EP Coaching.
      </P>
    ),
  },
  {
    id: "modification",
    title: "9. Évolution des conditions",
    body: (
      <P>
        Ces conditions peuvent évoluer. En cas de changement touchant aux droits ou obligations de l&apos;équipe, une
        nouvelle acceptation est demandée à la connexion suivante. Pour toute question :{" "}
        <Strong>peccoux.manu@gmail.com</Strong>.
      </P>
    ),
  },
];

export default function StaffTermsPage() {
  return (
    <LegalPage
      eyebrow="Équipe EP Coaching"
      title="Conditions de collaboration"
      lastUpdated="25 septembre 2026"
      intro={
        <P>
          Ces conditions s&apos;appliquent à toute personne recrutée qui utilise l&apos;espace équipe d&apos;EP
          Coaching, quel que soit son poste.
        </P>
      }
      sections={sections}
    />
  );
}
