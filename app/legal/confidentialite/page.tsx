import type { Metadata } from "next";
import { LegalPage, P, Ul, Strong, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Politique de confidentialité · EP Coaching",
  alternates: { canonical: "/legal/confidentialite" },
};

const sections: LegalSection[] = [
  {
    id: "responsable",
    title: "1. Responsable du traitement",
    body: (
      <>
        <P>
          Le responsable du traitement des données collectées via l&apos;application EP Coaching est{" "}
          <Strong>Emmanuel Peccoux</Strong>, entrepreneur individuel (micro-entreprise), immatriculé
          sous le numéro SIRET 10483817200013, dont le siège est situé 8 Rue de la Jonchère, 74600
          Annecy, France.
        </P>
        <P>
          Pour toute question relative à vos données personnelles, vous pouvez le contacter à
          l&apos;adresse : peccoux.manu@gmail.com.
        </P>
      </>
    ),
  },
  {
    id: "donnees",
    title: "2. Données collectées",
    body: (
      <>
        <P>Selon votre usage de l&apos;application, nous collectons :</P>
        <Ul>
          <li>
            <Strong>Données d&apos;identité et de contact</Strong> : prénom, nom, adresse email, numéro de
            téléphone, avatar, identifiant Instagram (facultatif).
          </li>
          <li>
            <Strong>Données de suivi sportif et nutritionnel</Strong> : poids, mensurations, photos de
            progression, calories et macronutriments consommés, performances d&apos;entraînement,
            journal d&apos;habitudes et de mindset, réponses aux check-ins hebdomadaires.
          </li>
          <li>
            <Strong>Données de santé au sens de l&apos;article 9 du RGPD</Strong> : informations liées à
            votre condition physique, votre sommeil et votre récupération lorsque vous connectez
            volontairement un objet Oura Ring, ainsi que toute information de santé que vous
            transmettez à votre coach. Ces données ne sont collectées qu&apos;avec votre consentement
            explicite et ne sont jamais utilisées à d&apos;autres fins que votre accompagnement.
          </li>
          <li>
            <Strong>Contenus que vous publiez</Strong> : messages échangés avec votre coach ou avec
            l&apos;équipe support, vidéos d&apos;exécution envoyées pour correction technique, publications et
            commentaires dans l&apos;espace Communauté.
          </li>
          <li>
            <Strong>Données de paiement</Strong> : lorsque vous souscrivez à une offre payante, le
            paiement est traité directement par notre prestataire Stripe. EP Coaching ne stocke jamais
            votre numéro de carte bancaire complet.
          </li>
          <li>
            <Strong>Données techniques de connexion</Strong> : identifiants de session, journaux
            techniques nécessaires à la sécurité et au bon fonctionnement de l&apos;application.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: "finalites",
    title: "3. Finalités et bases légales du traitement",
    body: (
      <>
        <Ul>
          <li>
            <Strong>Fourniture du service de coaching</Strong> (exécution du contrat) : mise en relation
            avec votre coach, suivi personnalisé, programmes, nutrition, messagerie, planification des
            sessions en direct.
          </li>
          <li>
            <Strong>Communications liées au service</Strong> (exécution du contrat) : notifications
            in-app et emails transactionnels (nouveau check-in, réponse du coach, rappel
            d&apos;échéance).
          </li>
          <li>
            <Strong>Newsletter EP Coaching</Strong> (consentement séparé et explicite) : uniquement si
            vous vous y êtes inscrit volontairement. Elle ne concerne jamais les données des clients
            des coachs tiers, sauf inscription personnelle de leur part à cette liste distincte.
          </li>
          <li>
            <Strong>Sécurité et prévention de la fraude</Strong> (intérêt légitime) : détection des
            usages anormaux, protection des comptes.
          </li>
          <li>
            <Strong>Obligations légales et comptables</Strong> (obligation légale) : conservation des
            factures et pièces comptables.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: "destinataires",
    title: "4. Qui a accès à vos données",
    body: (
      <>
        <P>
          Vos données sont accessibles uniquement au coach auquel vous êtes rattaché et à Emmanuel
          Peccoux, fondateur de la plateforme. L&apos;application applique un cloisonnement technique
          strict : un coach tiers n&apos;a jamais accès aux données des clients d&apos;un autre coach.
        </P>
        <P>Les données peuvent également être traitées par nos sous-traitants techniques, pour les besoins strictement nécessaires au fonctionnement du service :</P>
        <Ul>
          <li><Strong>Supabase</Strong> : hébergement de la base de données et des fichiers (photos, vidéos).</li>
          <li><Strong>Vercel</Strong> : hébergement de l&apos;application.</li>
          <li><Strong>Brevo</Strong> : envoi des emails transactionnels et, sur consentement séparé, de la newsletter.</li>
          <li><Strong>Stripe</Strong> : traitement sécurisé des paiements.</li>
          <li><Strong>Oura</Strong> : synchronisation des données de sommeil et de récupération, uniquement si vous connectez votre compte.</li>
          <li><Strong>Jitsi</Strong> : mise à disposition des salons de visioconférence pour les sessions en direct, sans enregistrement.</li>
          <li>
            <Strong>Anthropic</Strong> : fournisseur du modèle d&apos;intelligence artificielle (Claude)
            utilisé pour générer les réponses des coachs IA et certains messages automatisés de suivi
            (voir section suivante).
          </li>
        </Ul>
        <P>
          Vos données ne sont jamais vendues à des tiers ni utilisées à des fins publicitaires en dehors
          de la newsletter que vous avez explicitement acceptée.
        </P>
      </>
    ),
  },
  {
    id: "coachs-ia",
    title: "5. Coachs IA et messages automatisés",
    body: (
      <>
        <P>
          Certains coachs disponibles sur la plateforme sont des intelligences artificielles et non des
          personnes humaines. Ils sont systématiquement signalés par un badge « Coach IA » visible
          partout où ils apparaissent (annuaire, choix de coach, messagerie) : aucun coach IA n&apos;est
          jamais présenté comme un humain. Un coach IA se présente lui-même comme tel s&apos;il est
          interrogé directement à ce sujet.
        </P>
        <P>
          Lorsque vous échangez avec un coach IA, le contenu de vos messages est transmis à Anthropic
          pour générer une réponse, dans les mêmes conditions de sécurité que le reste de vos données
          (cloisonnement par coach, aucune revente). Les coachs IA sont volontairement limités à des
          sujets non cliniques (généraliste, prise de masse, perte de gras, force, débutants...) : toute
          question touchant à un sujet médical (blessure, trouble du comportement alimentaire,
          grossesse) est explicitement renvoyée vers un coach humain ou un professionnel de santé,
          jamais traitée par l&apos;intelligence artificielle elle-même.
        </P>
        <P>
          Un coach humain peut également, pour ses propres clients, s&apos;appuyer sur un agent IA interne
          pour rédiger un message de suivi personnalisé (par exemple une relance après une période
          d&apos;inactivité), ce message est alors envoyé depuis le compte de votre coach humain, jamais
          au nom d&apos;un tiers.
        </P>
      </>
    ),
  },
  {
    id: "transferts",
    title: "6. Transferts hors Union européenne",
    body: (
      <P>
        Certains sous-traitants mentionnés ci-dessus peuvent traiter des données en dehors de l&apos;Union
        européenne, notamment aux États-Unis. Ces transferts sont encadrés par les clauses
        contractuelles types adoptées par la Commission européenne ou par tout autre mécanisme
        équivalent garantissant un niveau de protection adéquat de vos données.
      </P>
    ),
  },
  {
    id: "conservation",
    title: "7. Durée de conservation",
    body: (
      <>
        <P>
          Vos données sont conservées pendant toute la durée d&apos;utilisation de votre compte. En cas
          d&apos;inactivité prolongée, elles sont conservées au maximum 3 ans à compter de votre dernière
          interaction avec EP Coaching, sauf demande de suppression anticipée de votre part.
        </P>
        <P>
          Lorsque vous supprimez votre compte via le bouton dédié dans vos paramètres, vos données
          personnelles sont effacées ou anonymisées dans un délai maximum de 30 jours, à l&apos;exception
          des données que nous sommes légalement tenus de conserver plus longtemps (documents
          comptables, conservés 10 ans conformément au droit français).
        </P>
      </>
    ),
  },
  {
    id: "securite",
    title: "8. Sécurité des données",
    body: (
      <P>
        L&apos;accès à vos données est protégé par des règles de sécurité au niveau de la base de données
        (chaque coach ne peut techniquement consulter que les données de ses propres clients), par un
        chiffrement systématique des échanges (HTTPS) et par un accès restreint aux seules personnes
        habilitées.
      </P>
    ),
  },
  {
    id: "droits",
    title: "9. Vos droits",
    body: (
      <>
        <P>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants sur vos données personnelles :</P>
        <Ul>
          <li>Droit d&apos;accès et de rectification de vos données.</li>
          <li>Droit à l&apos;effacement (droit à l&apos;oubli).</li>
          <li>Droit à la limitation et à l&apos;opposition du traitement.</li>
          <li>Droit à la portabilité de vos données.</li>
          <li>Droit de retirer votre consentement à tout moment, sans affecter la licéité des traitements déjà effectués.</li>
        </Ul>
        <P>
          Vous pouvez exercer votre droit à l&apos;effacement directement et à tout moment via le bouton
          « Supprimer mon compte » disponible dans les paramètres de votre profil. Pour tout autre
          droit, contactez peccoux.manu@gmail.com. Vous disposez également du droit d&apos;introduire une
          réclamation auprès de la Commission Nationale de l&apos;Informatique et des Libertés (CNIL).
        </P>
      </>
    ),
  },
  {
    id: "mineurs",
    title: "10. Mineurs",
    body: (
      <P>
        L&apos;application n&apos;est pas destinée aux personnes mineures sans l&apos;autorisation expresse d&apos;un
        représentant légal. Si vous pensez qu&apos;un mineur nous a transmis des données sans cette
        autorisation, contactez-nous afin que nous procédions à leur suppression.
      </P>
    ),
  },
  {
    id: "cookies",
    title: "11. Cookies",
    body: (
      <P>
        EP Coaching utilise uniquement des cookies techniques strictement nécessaires au
        fonctionnement de l&apos;application (maintien de votre session de connexion, préférences
        d&apos;affichage). Aucun cookie publicitaire ou de traçage tiers n&apos;est déposé.
      </P>
    ),
  },
  {
    id: "modifications",
    title: "12. Modification de la présente politique",
    body: (
      <P>
        Cette politique de confidentialité peut être mise à jour, notamment pour refléter l&apos;évolution
        des fonctionnalités de l&apos;application ou de la réglementation. La date de dernière mise à jour
        figure en haut de cette page. En cas de modification substantielle, vous en serez informé au
        sein de l&apos;application.
      </P>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Données personnelles"
      title="Politique de confidentialité"
      lastUpdated="19 août 2026"
      intro={
        <P>
          Cette politique explique quelles données EP Coaching collecte, pourquoi, comment elles sont
          protégées, et comment les contrôler. Elle s&apos;applique à toute personne utilisant
          l&apos;application EP Coaching, quel que soit son rôle (fondateur, coach ou client).
        </P>
      }
      sections={sections}
    />
  );
}
