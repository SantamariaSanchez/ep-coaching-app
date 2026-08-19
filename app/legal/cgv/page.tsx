import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, P, Ul, Strong, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente · EP Coaching",
};

const sections: LegalSection[] = [
  {
    id: "objet-cgv",
    title: "1. Objet",
    body: (
      <P>
        Les présentes Conditions Générales de Vente (CGV) s&apos;appliquent à toute souscription payante
        proposée sur l&apos;application EP Coaching. Elles complètent nos{" "}
        <Link href="/legal/cgu" style={{ color: "#E01E1E", fontWeight: 700 }}>
          Conditions Générales d&apos;Utilisation
        </Link>
        . Toute souscription à une offre payante implique l&apos;acceptation pleine et entière des présentes
        CGV.
      </P>
    ),
  },
  {
    id: "vendeur",
    title: "2. Identification du prestataire",
    body: (
      <P>
        <Strong>Emmanuel Peccoux</Strong>, entrepreneur individuel (micro-entreprise), SIRET
        10483817200013, code APE 8551Z, dont le siège est situé 8 Rue de la Jonchère, 74600 Annecy,
        France. Contact : peccoux.manu@gmail.com. TVA non applicable, article 293 B du Code Général
        des Impôts.
      </P>
    ),
  },
  {
    id: "offres",
    title: "3. Les deux types d'offres payantes",
    body: (
      <>
        <P>La Plateforme propose deux catégories distinctes d&apos;offres payantes :</P>
        <Ul>
          <li>
            <Strong>Abonnement Plateforme</Strong>, souscrit par un Coach indépendant pour accéder aux
            outils EP Coaching lui permettant de suivre ses propres clients.
          </li>
          <li>
            <Strong>Abonnement de coaching</Strong>, souscrit par un Client directement suivi par le
            Fondateur.
          </li>
        </Ul>
        <P>
          Les tarifs que chaque Coach tiers applique à ses propres clients sont fixés librement par ce
          dernier, en dehors de l&apos;application, et ne relèvent pas des présentes CGV : EP Coaching ne
          perçoit aucune commission sur ces montants.
        </P>
      </>
    ),
  },
  {
    id: "offre-coach",
    title: "4. Abonnement Plateforme (Coachs tiers)",
    body: (
      <>
        <P>Deux formules sont proposées au choix du Coach lors de son inscription :</P>
        <Ul>
          <li>Formule mensuelle : 100€ TTC par mois.</li>
          <li>Formule semestrielle : 480€ TTC par période de 6 mois.</li>
        </Ul>
        <P>
          Ce tarif est fixe et unique, quel que soit le nombre de clients suivis par le Coach sur la
          Plateforme.
        </P>
      </>
    ),
  },
  {
    id: "offre-client",
    title: "5. Abonnement de coaching (Clients du Fondateur)",
    body: (
      <P>
        Les tarifs de l&apos;abonnement de coaching proposé directement par le Fondateur sont communiqués
        au Client à l&apos;issue de l&apos;appel découverte préalable à toute souscription, et rappelés avant
        tout paiement. Les modalités spécifiques de cet accompagnement (prestations incluses,
        engagements réciproques) sont précisées dans le contrat de coaching signé par le Client au
        moment de son inscription.
      </P>
    ),
  },
  {
    id: "paiement",
    title: "6. Modalités de paiement",
    body: (
      <P>
        Le paiement s&apos;effectue par carte bancaire via Stripe, prestataire de paiement sécurisé. Les
        abonnements sont prélevés automatiquement à échéance régulière (mensuelle ou semestrielle
        selon la formule choisie), jusqu&apos;à résiliation dans les conditions prévues à l&apos;article 9.
      </P>
    ),
  },
  {
    id: "essai",
    title: "7. Essai gratuit (Coachs tiers)",
    body: (
      <P>
        L&apos;abonnement Plateforme souscrit par un Coach tiers inclut une période d&apos;essai gratuit de 2
        mois. Une carte bancaire est demandée dès l&apos;inscription. Sauf résiliation avant le terme de
        cette période d&apos;essai, le premier prélèvement intervient automatiquement à son échéance,
        selon la formule choisie. En acceptant les présentes CGV lors de son inscription, le Coach
        reconnaît avoir été informé de cette facturation automatique et l&apos;accepte expressément.
      </P>
    ),
  },
  {
    id: "retractation",
    title: "8. Droit de rétractation",
    body: (
      <>
        <P>
          <Strong>Coachs tiers</Strong> : l&apos;abonnement Plateforme est souscrit à des fins strictement
          professionnelles, dans le cadre de l&apos;activité indépendante du Coach. Conformément à l&apos;article
          L. 221-3 du Code de la consommation, le droit de rétractation applicable aux consommateurs
          ne s&apos;applique pas à cette souscription. Le Coach conserve néanmoins la possibilité de résilier
          librement, sans frais, à tout moment durant la période d&apos;essai gratuit décrite à l&apos;article 7.
        </P>
        <P>
          <Strong>Clients consommateurs</Strong> : l&apos;abonnement de coaching donne accès, dès sa
          souscription, à un contenu numérique et à un accompagnement personnalisé fourni
          immédiatement. Conformément à l&apos;article L. 221-28 du Code de la consommation, le Client
          qui demande expressément le commencement de la prestation avant l&apos;expiration du délai
          légal de rétractation, et qui renonce en conséquence à son droit de rétractation, ne peut plus
          exercer ce droit une fois l&apos;accompagnement débuté.
        </P>
      </>
    ),
  },
  {
    id: "duree",
    title: "9. Durée, reconduction et résiliation",
    body: (
      <P>
        Les abonnements sont conclus pour la durée de la formule choisie et se renouvellent
        automatiquement par tacite reconduction pour une durée identique, sauf résiliation. La
        résiliation peut être demandée à tout moment avec un préavis de 7 jours avant la prochaine
        échéance, par message écrit depuis la Plateforme ou par email à peccoux.manu@gmail.com. Toute
        période d&apos;abonnement déjà entamée reste due dans son intégralité.
      </P>
    ),
  },
  {
    id: "remboursement",
    title: "10. Absence de remboursement et défaut de paiement",
    body: (
      <>
        <P>
          Sauf disposition légale impérative contraire, aucun remboursement n&apos;est accordé au titre
          d&apos;une période d&apos;abonnement déjà entamée.
        </P>
        <P>
          En cas d&apos;échec ou de défaut de paiement répété sur l&apos;abonnement Plateforme, l&apos;accès du Coach
          concerné à son espace peut être suspendu. Cette suspension n&apos;entraîne aucune interruption
          de l&apos;accès de ses Clients à leurs propres données ni à la Plateforme.
        </P>
      </>
    ),
  },
  {
    id: "facturation",
    title: "11. Facturation",
    body: (
      <P>
        Un justificatif de paiement est mis à disposition via l&apos;espace client de notre prestataire de
        paiement Stripe pour chaque transaction.
      </P>
    ),
  },
  {
    id: "responsabilite-cgv",
    title: "12. Responsabilité relative au coaching dispensé par un tiers",
    body: (
      <>
        <P>
          Lorsque le service de coaching est dispensé par un Coach tiers, EP Coaching agit uniquement en
          qualité de fournisseur de la solution technique permettant cette relation. La responsabilité
          professionnelle liée au contenu, à la qualité et au bon déroulement du coaching relève
          exclusivement du Coach tiers concerné.
        </P>
        <P>
          Un Coach IA (voir Conditions Générales d&apos;Utilisation) est directement opéré par EP
          Coaching, jamais par un Coach tiers indépendant. Les contenus qu&apos;il génère restent soumis
          au même principe qu&apos;à l&apos;article 8 des CGU : ils ne se substituent en aucun cas à un avis
          médical, et tout sujet à caractère clinique est explicitement renvoyé vers un Coach humain ou
          un professionnel de santé.
        </P>
      </>
    ),
  },
  {
    id: "mediation",
    title: "13. Réclamation et médiation",
    body: (
      <P>
        Pour toute réclamation, le Client peut contacter peccoux.manu@gmail.com. Conformément aux
        articles L. 616-1 et suivants du Code de la consommation, tout Client consommateur dispose
        également, en cas de litige non résolu à l&apos;amiable, du droit de recourir gratuitement à un
        médiateur de la consommation. Les coordonnées du médiateur compétent sont communiquées sur
        simple demande auprès du Prestataire.
      </P>
    ),
  },
  {
    id: "droit-cgv",
    title: "14. Droit applicable",
    body: (
      <P>
        Les présentes CGV sont soumises au droit français. Tout litige relève, à défaut de résolution
        amiable, du tribunal compétent du domicile du Prestataire, sous réserve des règles impératives
        protégeant les consommateurs.
      </P>
    ),
  },
  {
    id: "modification-cgv",
    title: "15. Modification des CGV",
    body: (
      <P>
        Les présentes CGV peuvent être modifiées à tout moment. Les CGV applicables sont celles en
        vigueur à la date de souscription ou de renouvellement de l&apos;abonnement concerné.
      </P>
    ),
  },
];

export default function CGVPage() {
  return (
    <LegalPage
      eyebrow="Conditions de vente"
      title="Conditions Générales de Vente"
      lastUpdated="19 août 2026"
      intro={
        <P>
          Ces conditions régissent les souscriptions payantes proposées sur EP Coaching, que vous
          soyez Coach indépendant abonné à la Plateforme, ou Client directement accompagné par
          Emmanuel Peccoux.
        </P>
      }
      sections={sections}
    />
  );
}
