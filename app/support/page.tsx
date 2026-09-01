import type { Metadata } from "next";
import { LegalPage, P, Strong, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Assistance · EP Coaching",
};

// L'assistance n'est PAS un document contractuel : elle se tutoie comme le
// reste de l'appli (les CGU/CGV/confidentialité gardent le vouvoiement
// juridique, c'est leur registre), et elle n'a pas à porter les mentions
// légales de l'éditeur en pied de page. Seule l'identité publique de la
// marque y apparaît.
const sections: LegalSection[] = [
  {
    id: "contact",
    title: "Nous écrire",
    body: (
      <P>
        Une question sur ton compte, ton abonnement, ou un souci technique ? Écris directement à{" "}
        <Strong>Santamaria Sànchez</Strong> à l&apos;adresse <Strong>peccoux.manu@gmail.com</Strong>.
        On te répond sous 48 heures ouvrées.
      </P>
    ),
  },
  {
    id: "facturation",
    title: "Questions de facturation",
    body: (
      <P>
        Les paiements passent par Stripe. Pour un prélèvement, une facture ou une résiliation
        d&apos;abonnement, écris à la même adresse en précisant l&apos;email associé à ton compte, ça
        nous évite un aller-retour.
      </P>
    ),
  },
  {
    id: "donnees",
    title: "Tes données",
    body: (
      <P>
        Pour accéder à tes données, les corriger, les exporter ou les faire supprimer, la marche à
        suivre est détaillée dans la politique de confidentialité. Tu peux aussi supprimer ton compte
        toi-même depuis les paramètres de ton profil, à tout moment.
      </P>
    ),
  },
];

export default function SupportPage() {
  return (
    <LegalPage
      eyebrow="Assistance"
      title="Assistance"
      lastUpdated="1er septembre 2026"
      showLegalIdentity={false}
      intro={
        <P>
          Une question, un problème avec l&apos;application ou ton abonnement ? Voici comment joindre
          l&apos;équipe EP Coaching.
        </P>
      }
      sections={sections}
    />
  );
}
