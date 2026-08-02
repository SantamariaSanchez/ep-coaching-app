import type { Metadata } from "next";
import { LegalPage, P, Strong, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Assistance · EP Coaching",
};

const sections: LegalSection[] = [
  {
    id: "contact",
    title: "Nous contacter",
    body: (
      <P>
        Pour toute question sur votre compte, votre abonnement ou un problème technique, contactez
        directement <Strong>Emmanuel Peccoux</Strong> à l&apos;adresse{" "}
        <Strong>peccoux.manu@gmail.com</Strong>. Nous nous efforçons de répondre sous 48 heures
        ouvrées.
      </P>
    ),
  },
  {
    id: "facturation",
    title: "Questions de facturation",
    body: (
      <P>
        Les paiements sont gérés par Stripe. Pour toute question relative à un prélèvement, une
        facture ou une résiliation d&apos;abonnement, écrivez également à
        peccoux.manu@gmail.com en précisant l&apos;adresse email associée à votre compte.
      </P>
    ),
  },
];

export default function SupportPage() {
  return (
    <LegalPage
      eyebrow="Assistance"
      title="Assistance"
      lastUpdated="2 août 2026"
      intro={
        <P>
          Une question, un problème avec l&apos;application ou votre abonnement ? Voici comment
          joindre l&apos;équipe EP Coaching.
        </P>
      }
      sections={sections}
    />
  );
}
