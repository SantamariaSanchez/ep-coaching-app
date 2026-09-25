import { getRoleCard } from "@/lib/staff-roles";
import { escapeHtml } from "@/lib/sanitize";

// Contrat de collaboration signé à la première connexion d'une recrue
// (app/equipe/contrat), puis envoyé par email. Généré à partir de la fiche
// du poste dans lib/org-roles.ts : une seule source de vérité pour la
// mission, les tâches, la rémunération et les engagements non négociables.
//
// Contrat de PRESTATION (collaboration indépendante), jamais un contrat de
// travail salarié : c'est ce qu'annonce la page publique /carrieres pour
// tous les postes, et appeler "contrat de travail" une relation freelance
// exposerait à une requalification en salariat.
//
// À incrémenter dès qu'un changement touche les droits ou obligations d'une
// des parties : une nouvelle signature est alors demandée à la connexion
// suivante (voir app/equipe/layout.tsx).
export const STAFF_CONTRACT_VERSION = "2026-09-25";

/** Version des Conditions de collaboration (/legal/equipe). */
export const STAFF_TERMS_VERSION = "2026-09-25";

export const COMPANY = {
  name: "EP Coaching",
  legal: "Emmanuel Peccoux, entrepreneur individuel (micro-entreprise)",
  siret: "10483817200013",
  address: "8 Rue de la Jonchère, 74600 Annecy, France",
  email: "peccoux.manu@gmail.com",
};

export interface ContractArticle {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface StaffContract {
  title: string;
  roleTitle: string;
  poleName: string;
  articles: ContractArticle[];
}

export function buildStaffContract(roleKey: string, fullName: string, email: string): StaffContract | null {
  const found = getRoleCard(roleKey);
  if (!found) return null;
  const { role, pole } = found;

  const compensation: string[] = [];
  if (role.compensation.variable) compensation.push(`Part variable : ${role.compensation.variable}.`);
  if (role.compensation.fixed) compensation.push(`Part fixe : ${role.compensation.fixed}.`);
  if (compensation.length === 0) compensation.push("Rémunération à la prestation, selon un devis accepté par les deux parties avant chaque mission.");

  return {
    title: "Contrat de collaboration indépendante",
    roleTitle: role.title,
    poleName: pole.name,
    articles: [
      {
        title: "Entre les parties",
        paragraphs: [
          `${COMPANY.name}, exploitée par ${COMPANY.legal}, SIRET ${COMPANY.siret}, dont le siège est situé ${COMPANY.address}, ci après "EP Coaching".`,
          `Et ${fullName}, joignable à l'adresse ${email}, agissant en qualité de prestataire indépendant, ci après "le Prestataire".`,
        ],
      },
      {
        title: "1. Objet de la mission",
        paragraphs: [
          `EP Coaching confie au Prestataire, qui l'accepte, une mission de ${role.title} au sein du pôle ${pole.name}.`,
          `Mission : ${role.mission}`,
          "Le Prestataire rend compte de son activité au responsable indiqué dans la fiche de poste, qui fait partie intégrante du présent contrat :",
        ],
        bullets: [...role.tasks, `Rattachement : ${role.reportsTo}`],
      },
      {
        title: "2. Indépendance du Prestataire",
        paragraphs: [
          "Le Prestataire exerce sa mission en toute indépendance, sans lien de subordination. Il organise librement son temps de travail, ses horaires et ses méthodes, dans le respect des engagements de résultat et de délai décrits au présent contrat.",
          "Le Prestataire déclare disposer d'un statut lui permettant de facturer ses prestations (micro-entreprise ou société) avant sa première facture, et reste seul responsable de ses déclarations sociales et fiscales.",
        ],
      },
      {
        title: "3. Rémunération et facturation",
        paragraphs: [
          ...compensation,
          "Les parts variables sont calculées sur les montants effectivement encaissés par EP Coaching, déduction faite des remboursements et impayés.",
          "Le Prestataire émet une facture mensuelle récapitulant les prestations et commissions du mois écoulé. Elle est payable par virement dans les 30 jours suivant sa réception.",
          "Le montant et le déclenchement d'une éventuelle part fixe sont confirmés par écrit (email suffit) avant d'entrer en vigueur.",
        ],
      },
      {
        title: "4. Engagements non négociables",
        paragraphs: [
          "Le Prestataire s'engage à respecter les standards suivants, propres à son poste :",
        ],
        bullets: [
          ...role.nonNegotiable,
          "Tenir à jour son espace métier dans l'appli EP Coaching (suivi, agenda, rapport de fin de journée) pour que l'activité reste lisible par l'équipe.",
        ],
      },
      {
        title: "5. Période d'évaluation, durée et fin du contrat",
        paragraphs: [
          "Le contrat est conclu pour une durée indéterminée à compter de sa signature.",
          "Les trois premiers mois constituent une période d'évaluation, suivant le parcours d'intégration (découverte, pratique accompagnée, autonomie encadrée, bilan à 3 mois). Pendant cette période, chaque partie peut mettre fin au contrat par écrit avec un préavis de 7 jours.",
          "Après cette période, chaque partie peut y mettre fin par écrit avec un préavis de 15 jours. En cas de manquement grave (notamment à la confidentialité ou à la protection des données), EP Coaching peut y mettre fin sans préavis.",
          "Les commissions dues sur les ventes encaissées avant la fin du contrat restent dues.",
        ],
      },
      {
        title: "6. Confidentialité",
        paragraphs: [
          "Le Prestataire garde strictement confidentielles toutes les informations auxquelles il accède : données des clients et membres, chiffres de l'entreprise, méthodes, scripts, contenus non publiés, candidatures et informations sur l'équipe.",
          "Cette obligation s'applique pendant toute la durée du contrat et pendant 5 ans après sa fin. Pour les données de santé et les données personnelles des clients, elle ne s'arrête jamais.",
        ],
      },
      {
        title: "7. Protection des données personnelles",
        paragraphs: [
          "Les clients d'EP Coaching confient des données sensibles, dont des données de santé au sens de l'article 9 du RGPD. Le Prestataire n'y accède que dans la stricte mesure nécessaire à sa mission et uniquement sur instruction d'EP Coaching.",
        ],
        bullets: [
          "Aucune extraction, copie, capture d'écran ou transfert de données client hors des outils d'EP Coaching.",
          "Aucune donnée client collée dans un outil tiers (notamment un outil d'intelligence artificielle) sans accord écrit préalable.",
          "Identifiants personnels, jamais partagés. Double authentification activée dès qu'elle est proposée.",
          "Tout incident de sécurité ou perte de données signalé à EP Coaching dans les 24 heures.",
        ],
      },
      {
        title: "8. Propriété intellectuelle",
        paragraphs: [
          "Les créations réalisées par le Prestataire pour EP Coaching dans le cadre de sa mission (vidéos, textes, visuels, scripts, code, documents) sont cédées à EP Coaching au fur et à mesure de leur réalisation, en contrepartie de la rémunération prévue à l'article 3.",
          "Cette cession porte sur les droits de reproduction, de représentation, d'adaptation et de modification, sur tous supports et tous formats, pour le monde entier et pour toute la durée légale de protection des droits.",
          "Le Prestataire garantit être l'auteur de ses créations et n'y intégrer aucun élément appartenant à un tiers sans autorisation.",
        ],
      },
      {
        title: "9. Non sollicitation et image de marque",
        paragraphs: [
          "Pendant le contrat et les 12 mois qui suivent sa fin, le Prestataire s'interdit de démarcher pour son compte ou celui d'un tiers les clients d'EP Coaching dont il a eu connaissance dans le cadre de sa mission, et de solliciter les membres de l'équipe pour qu'ils quittent l'entreprise.",
          "Toute prise de parole publique au nom d'EP Coaching (réseaux sociaux, presse, partenaires) est validée au préalable par EP Coaching.",
        ],
      },
      {
        title: "10. Outils et accès",
        paragraphs: [
          "EP Coaching met à disposition du Prestataire un espace métier personnel dans l'appli. Cet accès est personnel, lié à la mission, et prend fin avec le contrat. Les données saisies dans cet espace appartiennent à EP Coaching.",
          "Les Conditions de collaboration de l'équipe EP Coaching, acceptées lors de la création de l'accès, complètent le présent contrat.",
        ],
      },
      {
        title: "11. Droit applicable et litiges",
        paragraphs: [
          "Le présent contrat est soumis au droit français. En cas de désaccord, les parties recherchent d'abord une solution amiable. À défaut, le litige relève du tribunal compétent d'Annecy.",
        ],
      },
      {
        title: "12. Signature électronique",
        paragraphs: [
          "Le Prestataire signe ce contrat électroniquement en saisissant son nom complet et en cochant la case d'acceptation. La date, l'heure, l'adresse IP et la version du contrat sont enregistrées, conformément aux articles 1366 et 1367 du Code civil. Une copie lui est envoyée par email.",
        ],
      },
    ],
  };
}

/** Version HTML (email) du contrat, avec la trace de signature. */
export function contractToHtml(
  contract: StaffContract,
  signature: { name: string; signedAt: string; version: string } | null
): string {
  const parts: string[] = [];
  parts.push(
    `<p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">${escapeHtml(contract.poleName)}</p>`,
    `<h2 style="margin:0 0 4px;font-size:18px;color:#ffffff;">${escapeHtml(contract.title)}</h2>`,
    `<p style="margin:0 0 18px;color:rgba(245,237,237,0.6);">Poste : ${escapeHtml(contract.roleTitle)}</p>`
  );
  for (const a of contract.articles) {
    parts.push(`<h3 style="margin:18px 0 6px;font-size:13px;color:#ffffff;">${escapeHtml(a.title)}</h3>`);
    for (const p of a.paragraphs) {
      parts.push(`<p style="margin:0 0 8px;color:rgba(245,237,237,0.85);font-size:13px;">${escapeHtml(p)}</p>`);
    }
    if (a.bullets?.length) {
      parts.push(
        `<ul style="margin:0 0 8px;padding-left:18px;color:rgba(245,237,237,0.85);font-size:13px;">${a.bullets
          .map((b) => `<li style="margin:0 0 4px;">${escapeHtml(b)}</li>`)
          .join("")}</ul>`
      );
    }
  }
  if (signature) {
    const when = new Date(signature.signedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
    parts.push(
      `<div style="margin:22px 0 0;padding:14px 16px;border:1px solid rgba(74,222,128,0.35);border-radius:10px;background:rgba(74,222,128,0.06);">` +
        `<p style="margin:0 0 4px;font-size:12px;color:#4ade80;font-weight:700;">Signé électroniquement</p>` +
        `<p style="margin:0;font-size:12px;color:rgba(245,237,237,0.8);">Par ${escapeHtml(signature.name)}, le ${escapeHtml(when)} (version ${escapeHtml(signature.version)}).</p>` +
        `</div>`
    );
  }
  return parts.join("");
}
