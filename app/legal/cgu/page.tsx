import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, P, Ul, Strong, type LegalSection } from "@/components/legal/LegalPage";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation · EP Coaching",
};

const sections: LegalSection[] = [
  {
    id: "objet",
    title: "1. Objet",
    body: (
      <P>
        Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;accès et l&apos;utilisation de
        l&apos;application EP Coaching (ci-après « la Plateforme »), éditée par Emmanuel Peccoux,
        entrepreneur individuel, SIRET 10483817200013, 8 Rue de la Jonchère, 74600 Annecy. Toute
        création de compte sur la Plateforme implique l&apos;acceptation pleine et entière des présentes
        CGU.
      </P>
    ),
  },
  {
    id: "definitions",
    title: "2. Définitions",
    body: (
      <Ul>
        <li><Strong>La Plateforme</Strong> : l&apos;application EP Coaching, accessible via ep-coaching.vercel.app et ses déclinaisons.</li>
        <li><Strong>Le Fondateur</Strong> : Emmanuel Peccoux, éditeur et opérateur de la Plateforme.</li>
        <li><Strong>Un Coach</Strong> : tout professionnel indépendant du sport ou du coaching qui utilise la Plateforme pour suivre ses propres clients, moyennant un abonnement décrit dans les Conditions Générales de Vente.</li>
        <li>
          <Strong>Un Coach IA</Strong> : un coach opéré par une intelligence artificielle plutôt que par
          une personne humaine, systématiquement signalé comme tel par un badge « Coach IA » partout où
          il apparaît sur la Plateforme. Un Coach IA n&apos;est jamais présenté comme un humain.
        </li>
        <li><Strong>Un Membre ou Client</Strong> : toute personne suivie par un Coach (le Fondateur, un Coach tiers ou un Coach IA), qu&apos;elle bénéficie d&apos;un accompagnement gratuit ou payant.</li>
        <li><Strong>Contenu</Strong> : toute donnée, texte, image, vidéo ou message publié ou transmis via la Plateforme.</li>
      </Ul>
    ),
  },
  {
    id: "fonctionnement",
    title: "3. Fonctionnement de la Plateforme",
    body: (
      <>
        <P>
          EP Coaching est une plateforme technique qui met en relation des Coachs indépendants avec
          leurs Clients, et fournit à chacun les outils nécessaires au suivi (programmes
          d&apos;entraînement, nutrition, check-ins, messagerie, sessions en direct, formations,
          Communauté).
        </P>
        <P>
          Lorsque votre Coach est un tiers indépendant, la relation de coaching elle-même (contenu,
          qualité, tarifs pratiqués auprès de ses propres clients) relève de sa seule responsabilité
          professionnelle. EP Coaching n&apos;est pas partie à cette relation de coaching et intervient
          uniquement en tant que fournisseur de l&apos;outil technique. Lorsque votre Coach est le
          Fondateur, la relation de coaching est régie par un contrat de coaching distinct qui vous est
          transmis séparément.
        </P>
        <P>
          Un même compte peut cumuler le rôle de Coach (pour ses propres clients) et de Client (dans le
          cadre de son propre suivi auprès d&apos;un autre Coach). Le compte du Fondateur dispose d&apos;un
          statut spécifique et unique lui donnant accès et droits complets sur l&apos;ensemble de la
          Plateforme.
        </P>
        <P>
          Certains Coachs disponibles sur la Plateforme sont des Coachs IA (voir Définitions). Un Coach
          IA génère ses réponses au moyen d&apos;une intelligence artificielle tierce (voir Politique de
          confidentialité) et reste volontairement limité aux sujets non cliniques de l&apos;entraînement et
          de la nutrition : toute question à caractère médical est orientée vers un Coach humain ou un
          professionnel de santé, jamais traitée par le Coach IA lui-même.
        </P>
      </>
    ),
  },
  {
    id: "compte",
    title: "4. Création de compte et accès",
    body: (
      <>
        <P>
          L&apos;accès à la Plateforme est réservé aux personnes majeures, ou aux mineurs disposant de
          l&apos;autorisation expresse d&apos;un représentant légal. Vous vous engagez à fournir des
          informations exactes lors de votre inscription et à les maintenir à jour.
        </P>
        <P>
          Vous êtes seul responsable de la confidentialité de vos identifiants de connexion et de toute
          activité réalisée depuis votre compte. Certains réglages, comme le jour de votre check-in
          hebdomadaire, sont configurés par votre Coach et non par vous-même, dans le cadre du suivi
          personnalisé qu&apos;il vous propose.
        </P>
      </>
    ),
  },
  {
    id: "compte-gratuit",
    title: "5. Compte gratuit : durée, limites et inactivité",
    body: (
      <>
        <P>
          L&apos;inscription à la Plateforme donne accès à un compte gratuit d&apos;une durée de{" "}
          <Strong>soixante (60) jours</Strong>, décomptés à partir de la date de création du compte.
          Ce compte gratuit est une période de découverte : il permet d&apos;utiliser la Plateforme et
          d&apos;échanger avec un Coach avant de décider de s&apos;engager dans un accompagnement.
        </P>
        <P>
          Au terme de ces 60 jours, si aucun accompagnement payant n&apos;a été souscrit, l&apos;accès aux
          fonctionnalités du compte est <Strong>suspendu</Strong>. Les données du compte
          (entraînements, mesures, historique, messages) sont conservées et redeviennent
          intégralement accessibles dès la souscription d&apos;un accompagnement. Aucune donnée
          n&apos;est supprimée du fait de cette suspension. Vous pouvez à tout moment demander la
          suppression définitive de votre compte, ou exercer votre droit à la portabilité de vos
          données dans les conditions prévues par la Politique de confidentialité.
        </P>
        <P>
          Pendant la période gratuite, certaines fonctionnalités sont volontairement limitées ou
          réservées aux Clients accompagnés, notamment :
        </P>
        <Ul>
          <li>
            <Strong>La bibliothèque de ressources</Strong> n&apos;est pas parcourable depuis
            l&apos;application. Les guides et ressources restent accessibles individuellement par le
            lien qui vous est transmis.
          </li>
          <li>
            <Strong>Les outils de génération automatique</Strong> (recettes, contenus assistés par
            intelligence artificielle) sont soumis à un quota mensuel.
          </li>
          <li>
            D&apos;autres fonctionnalités peuvent être réservées aux Clients accompagnés. La liste des
            limitations en vigueur est consultable à tout moment depuis les paramètres de votre
            compte.
          </li>
        </Ul>
        <P>
          <Strong>Inactivité.</Strong> Un compte gratuit resté sans aucune connexion pendant{" "}
          <Strong>soixante (60) jours consécutifs</Strong> est considéré comme abandonné et fait
          l&apos;objet d&apos;une suppression définitive. Deux avertissements sont envoyés par email
          avant toute suppression, le premier après environ 40 jours d&apos;inactivité, le second
          après environ 55 jours. Une simple connexion suffit à annuler la procédure. Cette règle ne
          s&apos;applique jamais aux Clients bénéficiant d&apos;un accompagnement payant.
        </P>
      </>
    ),
  },
  {
    id: "abonnements",
    title: "6. Abonnements et accès payant",
    body: (
      <P>
        Certaines fonctionnalités de la Plateforme sont soumises à un abonnement payant (abonnement
        plateforme pour les Coachs tiers, abonnement de coaching pour les Clients du Fondateur). Les
        modalités de tarification, de paiement, de renouvellement et de résiliation de ces abonnements
        sont détaillées dans nos{" "}
        <Link href="/legal/cgv" style={{ color: "#E01E1E", fontWeight: 700 }}>
          Conditions Générales de Vente
        </Link>
        .
      </P>
    ),
  },
  {
    id: "contenu",
    title: "7. Contenu publié par les utilisateurs",
    body: (
      <>
        <P>
          Vous restez propriétaire du contenu que vous publiez sur la Plateforme (photos, vidéos,
          messages, publications dans la Communauté). En le publiant, vous accordez à EP Coaching une
          licence limitée à l&apos;hébergement, l&apos;affichage et la transmission de ce contenu aux personnes
          concernées par votre suivi (votre Coach, ou les autres membres de la Communauté pour les
          publications partagées), strictement dans le cadre du fonctionnement du service.
        </P>
        <P>
          Vous vous interdisez de publier tout contenu illicite, injurieux, discriminatoire,
          diffamatoire, ou portant atteinte aux droits d&apos;un tiers. Le Fondateur se réserve le droit de
          retirer tout contenu contraire aux présentes CGU.
        </P>
      </>
    ),
  },
  {
    id: "communaute",
    title: "8. Règles de la Communauté et modération",
    body: (
      <>
        <P>
          L&apos;espace Communauté est un lieu d&apos;échange partagé entre les membres de la Plateforme.
          Chacun s&apos;engage à s&apos;y comporter avec respect et bienveillance.
        </P>
        <P>
          Afin de garantir la cohérence de la modération sur l&apos;ensemble de la Plateforme, seul le
          Fondateur dispose d&apos;un pouvoir de modération sur l&apos;espace Communauté partagé, y compris sur
          les publications des clients d&apos;un Coach tiers. Le Fondateur peut, en cas de manquement grave
          ou répété aux présentes CGU, envoyer un message direct à l&apos;utilisateur concerné,
          déconnecter sa session en cours, ou supprimer son compte.
        </P>
      </>
    ),
  },
  {
    id: "sante",
    title: "9. Santé et pratique sportive",
    body: (
      <P>
        Les contenus et recommandations disponibles sur la Plateforme, qu&apos;ils proviennent de votre
        Coach ou des ressources mises à disposition, ne se substituent en aucun cas à un avis médical.
        Vous êtes seul responsable de vous assurer être apte à la pratique sportive avant de suivre un
        programme d&apos;entraînement, et de signaler à votre Coach toute condition médicale pertinente.
      </P>
    ),
  },
  {
    id: "disponibilite",
    title: "10. Disponibilité du service",
    body: (
      <P>
        Le Fondateur s&apos;efforce d&apos;assurer un accès continu à la Plateforme mais ne peut garantir une
        disponibilité ininterrompue. Des interruptions temporaires peuvent survenir pour des raisons de
        maintenance, de mise à jour ou de force majeure. La Plateforme évolue régulièrement : de
        nouvelles fonctionnalités peuvent être ajoutées, modifiées ou retirées.
      </P>
    ),
  },
  {
    id: "resiliation",
    title: "11. Résiliation et suppression de compte",
    body: (
      <P>
        Vous pouvez supprimer votre compte à tout moment depuis les paramètres de votre profil. Le
        traitement de vos données personnelles suite à cette suppression est décrit dans notre{" "}
        <Link href="/legal/confidentialite" style={{ color: "#E01E1E", fontWeight: 700 }}>
          Politique de confidentialité
        </Link>
        . La suppression de votre compte n&apos;emporte pas automatiquement remboursement d&apos;un
        abonnement en cours, dans les conditions prévues par les CGV.
      </P>
    ),
  },
  {
    id: "responsabilite",
    title: "12. Responsabilité",
    body: (
      <P>
        La responsabilité du Fondateur, en tant qu&apos;éditeur de la Plateforme, ne saurait être engagée en
        cas de dommage résultant d&apos;une mauvaise utilisation du service, d&apos;un cas de force majeure, ou
        du fait d&apos;un tiers. S&apos;agissant des Coachs tiers, leur responsabilité professionnelle propre est
        seule engagée quant à la qualité et au contenu du coaching qu&apos;ils dispensent à leurs Clients.
      </P>
    ),
  },
  {
    id: "donnees-perso",
    title: "13. Protection des données personnelles",
    body: (
      <P>
        Le traitement de vos données personnelles est décrit en détail dans notre{" "}
        <Link href="/legal/confidentialite" style={{ color: "#E01E1E", fontWeight: 700 }}>
          Politique de confidentialité
        </Link>
        , qui fait partie intégrante des présentes CGU.
      </P>
    ),
  },
  {
    id: "droit",
    title: "14. Droit applicable et litiges",
    body: (
      <P>
        Les présentes CGU sont soumises au droit français. En cas de litige, les parties s&apos;engagent à
        rechercher une solution amiable avant tout recours judiciaire. À défaut d&apos;accord amiable, le
        tribunal compétent sera celui du domicile du Fondateur, sous réserve des règles impératives
        applicables aux consommateurs.
      </P>
    ),
  },
  {
    id: "modification-cgu",
    title: "15. Modification des CGU",
    body: (
      <P>
        Les présentes CGU peuvent être modifiées à tout moment afin de refléter l&apos;évolution de la
        Plateforme ou de la réglementation applicable. La poursuite de l&apos;utilisation de la Plateforme
        après modification vaut acceptation des nouvelles CGU.
      </P>
    ),
  },
  {
    id: "contact-cgu",
    title: "16. Contact",
    body: <P>Pour toute question relative aux présentes CGU, contactez peccoux.manu@gmail.com.</P>,
  },
];

export default function CGUPage() {
  return (
    <LegalPage
      eyebrow="Conditions d'utilisation"
      title="Conditions Générales d'Utilisation"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro={
        <P>
          Merci de lire attentivement ces conditions avant d&apos;utiliser EP Coaching. Elles définissent les
          règles d&apos;accès et d&apos;usage de la Plateforme, quel que soit votre rôle : Fondateur, Coach ou
          Membre.
        </P>
      }
      sections={sections}
    />
  );
}
