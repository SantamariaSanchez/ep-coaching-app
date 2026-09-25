// Mode d'emploi quotidien de chaque métier (demande directe 2026-09-25 :
// "qu'il sache ce qu'il doit faire, quand il doit le faire, quoi logger").
// Fichier pur : la routine s'affiche sur le tableau de bord (bloc en cours
// selon l'heure de Paris), les règles de saisie à côté, et le briefing du
// matin reprend la même source.

import type { ModuleKey } from "@/lib/staff-roles";

export interface RoutineBlock {
  start: string;
  end: string;
  title: string;
  detail: string;
  href?: string;
}

export interface LogRule {
  when: string;
  what: string;
  where: ModuleKey;
}

export interface Ritual {
  /** 1 = lundi ... 5 = vendredi. */
  day: number;
  title: string;
  detail: string;
}

export interface TargetDef {
  key: string;
  label: string;
  unit: "count" | "eur";
}

export interface Playbook {
  routine: RoutineBlock[];
  logRules: LogRule[];
  rituals: Ritual[];
  targets: TargetDef[];
}

function plusMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + minutes;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

const REPORT_BLOCK = (start: string): RoutineBlock => ({
  start,
  end: plusMinutes(start, 20),
  title: "Rapport du jour",
  detail: "Tes chiffres de la journée, une victoire, un blocage. Deux minutes, pas plus.",
  href: "/equipe/rapports",
});

const REPORT_RULE: LogRule = {
  when: "En fin de journée",
  what: "Envoie ton rapport du jour : les chiffres demandés, ta victoire et ce qui t'a bloqué.",
  where: "rapports",
};

export const PLAYBOOKS: Record<string, Playbook> = {
  closer: {
    routine: [
      { start: "08:45", end: "09:15", title: "Préparation des appels", detail: "Ouvre chaque RDV du jour : relis les réponses de préqualification et l'historique dans la fiche. Note l'objection probable avant d'appeler.", href: "/equipe/agenda" },
      { start: "09:30", end: "12:30", title: "Appels du matin", detail: "Appels de closing. Juste après chaque appel, logge l'issue avant de passer au suivant.", href: "/equipe/agenda" },
      { start: "14:00", end: "17:30", title: "Appels de l'après-midi", detail: "Même règle : un appel terminé = une issue loggée, tout de suite.", href: "/equipe/agenda" },
      { start: "17:30", end: "18:00", title: "Relances", detail: "Prospects en Appel tenu sans décision et liens de paiement pas encore réglés.", href: "/equipe/crm" },
      REPORT_BLOCK("18:00"),
    ],
    logRules: [
      { when: "Juste après chaque appel", what: "Passe le RDV en Honoré ou No-show. Honoré fait avancer le prospect en Appel tenu tout seul, No-show prévient le setter.", where: "agenda" },
      { when: "Le prospect signe", what: "Fiche en Closé avec le montant encaissé. S'il paie par ton lien Stripe, c'est automatique, vérifie juste que c'est bien arrivé.", where: "crm" },
      { when: "Pas de décision", what: "Étape Appel tenu, objection principale renseignée et prochaine relance datée.", where: "crm" },
      { when: "C'est non", what: "Étape Perdu avec l'objection principale. On ne supprime jamais une fiche, elle sert à comprendre ce qui bloque.", where: "crm" },
      REPORT_RULE,
    ],
    rituals: [
      { day: 1, title: "Revue du pipeline", detail: "Chaque prospect ouvert a une prochaine relance datée. Aucune exception." },
      { day: 5, title: "Réécoute d'un appel perdu", detail: "Identifie l'objection mal traitée et la question qui aurait changé l'issue (voir Scripts d'appel)." },
    ],
    targets: [
      { key: "ventes", label: "Ventes", unit: "count" },
      { key: "cash", label: "Cash collecté", unit: "eur" },
      { key: "appels", label: "Appels tenus", unit: "count" },
    ],
  },
  setter: {
    routine: [
      { start: "09:00", end: "09:30", title: "Leads de la nuit", detail: "Premier message à chaque nouveau lead du CRM. Standard : moins de 2h en journée.", href: "/equipe/crm" },
      { start: "09:30", end: "12:00", title: "Conversations et qualification", detail: "DM et commentaires. Les 3 questions : objectif, expérience de coaching, disponibilité réelle.", href: "/equipe/crm" },
      { start: "14:00", end: "16:00", title: "Relances et no-show", detail: "Toutes les relances datées du jour, puis les no-show signalés par les closers.", href: "/equipe/crm" },
      { start: "16:00", end: "17:30", title: "Deuxième passage leads", detail: "Nouveaux leads arrivés dans la journée, réponses reçues.", href: "/equipe/crm" },
      REPORT_BLOCK("17:45"),
    ],
    logRules: [
      { when: "Premier message envoyé", what: "Fiche en Contacté et prochaine relance datée.", where: "crm" },
      { when: "Les 3 réponses sont bonnes", what: "Étape Qualifié, avec ses réponses dans les notes : le closer les lira avant l'appel.", where: "crm" },
      { when: "RDV pris", what: "Étape RDV booké. S'il réserve via Calendly, c'est automatique et le closer le reçoit dans son agenda.", where: "crm" },
      { when: "Pas qualifié", what: "Étape Perdu avec la raison, sans insister.", where: "crm" },
      REPORT_RULE,
    ],
    rituals: [
      { day: 1, title: "Nettoyage du CRM", detail: "Aucun lead ouvert sans prochaine relance datée." },
      { day: 4, title: "Point qualité avec les closers", detail: "Ton taux de présentation et les RDV qui n'auraient pas dû être bookés." },
    ],
    targets: [
      { key: "rdv", label: "RDV bookés", unit: "count" },
      { key: "qualifies", label: "Leads qualifiés", unit: "count" },
    ],
  },
  "head-of-sales": {
    routine: [
      { start: "09:00", end: "09:30", title: "Chiffres d'hier", detail: "Mon équipe : rapports reçus, ventes, taux de close, RDV bookés.", href: "/equipe/equipe" },
      { start: "09:30", end: "10:00", title: "Point d'équipe", detail: "Objectif du jour par personne, blocages remontés dans les rapports." },
      { start: "10:00", end: "12:00", title: "Coaching et réécoute", detail: "Un coaching individuel ou la réécoute d'un appel, avec 2 points d'action écrits.", href: "/equipe/scripts" },
      { start: "14:00", end: "17:00", title: "Closing ou recrutement", detail: "Tes propres appels, ou les entretiens de setters et closers.", href: "/equipe/agenda" },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Après chaque coaching", what: "Une tâche avec les 2 points d'action, datée pour la vérification.", where: "taches" },
      { when: "Tes propres appels", what: "Mêmes règles que les closers : issue loggée juste après l'appel.", where: "agenda" },
      REPORT_RULE,
    ],
    rituals: [
      { day: 1, title: "Objectifs de la semaine", detail: "Un objectif chiffré par personne, noté dans leurs tâches." },
      { day: 3, title: "Réécoute de 2 appels", detail: "Un gagné, un perdu, pour mettre à jour les scripts." },
      { day: 5, title: "Bilan au fondateur", detail: "CA signé, goulot d'étranglement de la semaine, décision proposée." },
    ],
    targets: [
      { key: "ca_equipe", label: "CA signé par l'équipe", unit: "eur" },
      { key: "ventes_equipe", label: "Ventes de l'équipe", unit: "count" },
    ],
  },
  "createur-contenu-videaste": {
    routine: [
      { start: "09:00", end: "09:30", title: "Planning du jour", detail: "Livrables du jour et deadlines de la semaine.", href: "/equipe/livrables" },
      { start: "09:30", end: "12:30", title: "Montage", detail: "Le livrable dont la deadline est la plus proche d'abord." },
      { start: "14:00", end: "16:30", title: "Tournage ou montage", detail: "Tournages prévus dans l'agenda, sinon suite du montage.", href: "/equipe/agenda" },
      { start: "16:30", end: "17:30", title: "Exports et livraison", detail: "Formats de chaque plateforme, sous-titres, lien du fichier dans le livrable." },
      REPORT_BLOCK("17:45"),
    ],
    logRules: [
      { when: "Nouvelle vidéo à faire", what: "Un livrable en Idée avec sa deadline et sa plateforme.", where: "livrables" },
      { when: "Tu commences", what: "Étape En cours. Envoyée pour validation : En relecture.", where: "livrables" },
      { when: "Exportée", what: "Étape Livré avec le lien du fichier. En ligne : Publié.", where: "livrables" },
      REPORT_RULE,
    ],
    rituals: [
      { day: 1, title: "Planifier les tournages", detail: "Tournages de la semaine posés dans l'agenda." },
      { day: 5, title: "Vider la relecture", detail: "Tout ce qui attend une validation est relancé ou livré." },
    ],
    targets: [{ key: "livres", label: "Vidéos livrées", unit: "count" }],
  },
  "community-manager": {
    routine: [
      { start: "09:00", end: "09:45", title: "Publication et nuit", detail: "Publication du jour, puis réponses aux commentaires et messages de la nuit.", href: "/equipe/livrables" },
      { start: "11:00", end: "11:30", title: "Passage réponses", detail: "Standard : moins de 4h pour une réponse publique en journée." },
      { start: "14:00", end: "15:00", title: "Passage réponses et questions chaudes", detail: "Toute question qui ressemble à une intention d'achat part en tâche ou dans ton rapport." },
      { start: "15:00", end: "16:30", title: "Calendrier", detail: "Contenus de la semaine prochaine préparés dans les livrables.", href: "/equipe/livrables" },
      REPORT_BLOCK("18:00"),
    ],
    logRules: [
      { when: "Post publié", what: "Livrable en Publié avec le lien.", where: "livrables" },
      { when: "Question chaude repérée", what: "Une tâche immédiate pour la faire suivre, et le compteur dans ton rapport.", where: "taches" },
      REPORT_RULE,
    ],
    rituals: [
      { day: 1, title: "Calendrier validé", detail: "La semaine complète est planifiée dans les livrables." },
      { day: 5, title: "Statistiques d'engagement", detail: "Ce qui a le mieux marché et l'ajustement pour la semaine suivante." },
    ],
    targets: [{ key: "publies", label: "Posts publiés", unit: "count" }],
  },
  copywriter: {
    routine: [
      { start: "09:00", end: "09:30", title: "Briefs et deadlines", detail: "Textes du jour, deadlines de la semaine.", href: "/equipe/livrables" },
      { start: "09:30", end: "12:00", title: "Écriture", detail: "Premier jet dans la voix de la marque, sans attendre l'inspiration." },
      { start: "14:00", end: "16:00", title: "Réécriture et relectures", detail: "Retours reçus, accroches à tester." },
      { start: "16:00", end: "17:00", title: "Livraison", detail: "Lien du document dans chaque livrable terminé." },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Nouveau texte à écrire", what: "Un livrable avec le format et la deadline.", where: "livrables" },
      { when: "Envoyé pour validation", what: "Étape En relecture. Validé : Livré avec le lien.", where: "livrables" },
      REPORT_RULE,
    ],
    rituals: [
      { day: 1, title: "Planning d'écriture", detail: "Tous les textes de la semaine ont une deadline." },
      { day: 4, title: "Test d'accroches", detail: "3 variantes d'accroche sur un même contenu, résultat noté." },
    ],
    targets: [{ key: "livres", label: "Textes livrés", unit: "count" }],
  },
  "personal-brand-manager": {
    routine: [
      { start: "09:00", end: "09:30", title: "Veille réputation", detail: "Mentions, commentaires sensibles, tout enjeu qui demande une réaction sous 24h." },
      { start: "10:00", end: "12:00", title: "Opportunités", detail: "Interviews, podcasts, collaborations : prise de contact et relances.", href: "/equipe/opportunites" },
      { start: "14:00", end: "15:00", title: "Point avec le fondateur", detail: "Validation des prises de parole à venir." },
      { start: "15:00", end: "17:00", title: "Préparation", detail: "Fiches de préparation des interventions confirmées.", href: "/equipe/agenda" },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Chaque piste", what: "Une opportunité avec son étape et sa prochaine date.", where: "opportunites" },
      { when: "Intervention confirmée", what: "Étape Confirmé et le créneau dans l'agenda.", where: "agenda" },
      { when: "Publiée", what: "Étape Publié avec le lien et l'audience estimée.", where: "opportunites" },
      REPORT_RULE,
    ],
    rituals: [
      { day: 1, title: "Point fondateur", detail: "Les prises de parole de la semaine validées." },
      { day: 5, title: "Bilan réputation", detail: "Ce qui s'est dit sur la marque cette semaine." },
    ],
    targets: [{ key: "confirmees", label: "Opportunités confirmées", unit: "count" }],
  },
  "growth-traffic-manager": {
    routine: [
      { start: "09:00", end: "09:45", title: "Chiffres d'hier", detail: "Dépense, leads, coût par lead de chaque campagne.", href: "/equipe/campagnes" },
      { start: "10:00", end: "11:30", title: "Optimisation", detail: "Coupe ce qui ne performe pas plutôt que d'attendre." },
      { start: "14:00", end: "16:00", title: "Nouveaux tests", detail: "Un format ou une audience testé à la fois, avec son hypothèse notée." },
      { start: "16:00", end: "16:30", title: "Mise à jour dans l'appli", detail: "Dépense, leads, ventes et CA de chaque campagne active.", href: "/equipe/campagnes" },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Chaque jour, pour chaque campagne active", what: "Dépensé, leads, ventes et CA à jour : le coût par lead et le ROAS se calculent seuls.", where: "campagnes" },
      { when: "Campagne coupée", what: "Étape En pause ou Terminée, avec la raison dans les notes.", where: "campagnes" },
      REPORT_RULE,
    ],
    rituals: [
      { day: 1, title: "Budget de la semaine", detail: "Répartition validée par le Head of Marketing." },
      { day: 4, title: "Bilan des tests", detail: "Tests gardés, tests coupés, prochain test." },
    ],
    targets: [
      { key: "leads", label: "Leads générés", unit: "count" },
      { key: "ca_pub", label: "CA généré par la pub", unit: "eur" },
    ],
  },
  "head-of-marketing": {
    routine: [
      { start: "09:00", end: "09:30", title: "Revue de l'équipe", detail: "Livrables en retard, rapports reçus, campagnes.", href: "/equipe/equipe" },
      { start: "09:30", end: "11:00", title: "Validation des contenus", detail: "Tout ce qui est en relecture chez l'équipe.", href: "/equipe/livrables" },
      { start: "14:00", end: "15:30", title: "Stratégie et budget", detail: "Canal qui coince, contenu d'acquisition ou de conversion." },
      { start: "16:00", end: "16:30", title: "Point growth", detail: "Coût par lead, ROAS, arbitrages de budget.", href: "/equipe/campagnes" },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Décision d'arbitrage", what: "Une tâche datée pour la personne concernée.", where: "taches" },
      REPORT_RULE,
    ],
    rituals: [
      { day: 1, title: "Calendrier éditorial", detail: "Priorités de la semaine par plateforme." },
      { day: 5, title: "Bilan au fondateur", detail: "Notoriété, acquisition, canal à corriger." },
    ],
    targets: [{ key: "livres_equipe", label: "Contenus livrés par l'équipe", unit: "count" }],
  },
  "developpeur-saas": {
    routine: [
      { start: "09:00", end: "09:30", title: "Bugs et tickets critiques", detail: "Rien de critique ne reste ouvert avant de coder autre chose.", href: "/equipe/tickets" },
      { start: "09:30", end: "12:30", title: "Développement", detail: "La fonctionnalité en cours du backlog.", href: "/equipe/backlog" },
      { start: "14:00", end: "16:30", title: "Développement et tests", detail: "Test réel de tout ce qui touche des données de santé." },
      { start: "16:30", end: "17:30", title: "Livraison et documentation", detail: "Ce qui part en production est documenté." },
      REPORT_BLOCK("17:45"),
    ],
    logRules: [
      { when: "Bug trouvé ou remonté", what: "Un ticket de type Bug avec sa priorité.", where: "tickets" },
      { when: "Fonctionnalité qui avance", what: "Étape En développement, En test, puis Livré.", where: "backlog" },
      REPORT_RULE,
    ],
    rituals: [
      { day: 1, title: "Priorisation avec le Product Manager", detail: "Ce qui passe en développement cette semaine." },
      { day: 5, title: "Démo", detail: "Ce qui a été livré, montré en vrai." },
    ],
    targets: [
      { key: "resolus", label: "Tickets résolus", unit: "count" },
      { key: "features", label: "Fonctionnalités livrées", unit: "count" },
    ],
  },
  "product-manager": {
    routine: [
      { start: "09:00", end: "09:45", title: "Tickets et retours", detail: "Nouveaux retours coachs et clients, tickets critiques.", href: "/equipe/tickets" },
      { start: "10:00", end: "12:00", title: "Spécifications", detail: "Une spec qu'un développeur suit sans revenir poser 10 questions.", href: "/equipe/backlog" },
      { start: "14:00", end: "14:30", title: "Point développement", detail: "Blocages, arbitrages de périmètre." },
      { start: "15:00", end: "16:30", title: "Données d'usage", detail: "Ce que les gens utilisent vraiment, pour prioriser." },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Nouvelle demande", what: "Une entrée au backlog en Idée, avec qui la demande et son impact.", where: "backlog" },
      { when: "Spec écrite", what: "Étape Spécifié avec le lien de la spec.", where: "backlog" },
      REPORT_RULE,
    ],
    rituals: [
      { day: 1, title: "Priorisation de la semaine", detail: "Ce qui passe en développement, avec la donnée qui le justifie." },
      { day: 5, title: "Bilan produit", detail: "Livré, appris, prochaine priorité." },
    ],
    targets: [{ key: "features_livrees", label: "Fonctionnalités livrées", unit: "count" }],
  },
  "support-client-tech": {
    routine: [
      { start: "09:00", end: "10:00", title: "Tickets de la nuit", detail: "Standard : réponse sous 24h ouvrées.", href: "/equipe/tickets" },
      { start: "11:00", end: "11:30", title: "Passage tickets", detail: "Nouveaux tickets et réponses attendues." },
      { start: "14:00", end: "15:00", title: "Passage tickets", detail: "Priorité aux critiques." },
      { start: "15:00", end: "16:30", title: "Documentation", detail: "Bugs récurrents décrits pour le développeur, FAQ à jour." },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Chaque demande reçue", what: "Un ticket avec le demandeur, le canal et la priorité.", where: "tickets" },
      { when: "Résolu", what: "Étape Résolu avec la résolution apportée, pour la FAQ.", where: "tickets" },
      REPORT_RULE,
    ],
    rituals: [{ day: 5, title: "Top 3 des problèmes", detail: "Les 3 sujets les plus remontés, transmis au Product Manager." }],
    targets: [{ key: "resolus", label: "Tickets résolus", unit: "count" }],
  },
  "office-ops-manager": {
    routine: [
      { start: "09:00", end: "09:30", title: "Outils et accès", detail: "Accès des nouvelles recrues, outils en panne." },
      { start: "09:30", end: "11:30", title: "Process", detail: "Un process écrit plutôt que gardé en tête.", href: "/equipe/process" },
      { start: "14:00", end: "15:30", title: "Coordination entre pôles", detail: "Sujets qui dépassent une équipe." },
      { start: "16:00", end: "17:00", title: "Intégration des recrues", detail: "Parcours d'intégration de chaque nouvelle personne." },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Process repéré", what: "Une entrée À écrire, puis Brouillon, puis Validé avec le lien du document.", where: "process" },
      REPORT_RULE,
    ],
    rituals: [{ day: 1, title: "Point des pôles", detail: "Ce qui risque de devenir un problème cette semaine." }],
    targets: [{ key: "process_valides", label: "Process validés", unit: "count" }],
  },
  "secretaire-assistant": {
    routine: [
      { start: "08:45", end: "10:00", title: "Emails administratifs", detail: "Standard : aucun email sans réponse plus de 48h." },
      { start: "10:00", end: "11:00", title: "Agendas", detail: "Agenda du fondateur et des responsables de pôle.", href: "/equipe/agenda" },
      { start: "14:00", end: "15:00", title: "Classement", detail: "Chaque document arrivé aujourd'hui est classé aujourd'hui." },
      { start: "16:00", end: "17:00", title: "Emails et appels", detail: "Deuxième passage." },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Rendez-vous organisé", what: "Dans l'agenda, avec la personne concernée et le lien.", where: "agenda" },
      { when: "Demande à traiter plus tard", what: "Une tâche datée.", where: "taches" },
      REPORT_RULE,
    ],
    rituals: [{ day: 5, title: "Archivage", detail: "Rien ne reste à classer pour la semaine suivante." }],
    targets: [{ key: "emails", label: "Emails traités", unit: "count" }],
  },
  "finance-comptabilite": {
    routine: [
      { start: "09:00", end: "10:00", title: "Paiements d'hier", detail: "Les paiements Stripe arrivent seuls en trésorerie : vérifie-les.", href: "/equipe/finance" },
      { start: "10:00", end: "11:00", title: "Impayés", detail: "Écritures En retard : relance et note.", href: "/equipe/finance" },
      { start: "14:00", end: "15:30", title: "Factures et dépenses", detail: "Chaque dépense de la veille saisie." },
      { start: "16:00", end: "17:00", title: "Tableau de bord", detail: "Encaissé, dépensé, solde du mois." },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Paiement client", what: "Automatique depuis Stripe (premier paiement et renouvellements). Vérifie le montant.", where: "finance" },
      { when: "Dépense", what: "Une écriture Dépense avec la catégorie et le fournisseur.", where: "finance" },
      { when: "Paiement pas reçu à la date", what: "Étape En retard, puis relance notée.", where: "finance" },
      REPORT_RULE,
    ],
    rituals: [
      { day: 1, title: "Trésorerie de la semaine", detail: "Encaissements attendus et dépenses prévues." },
      { day: 5, title: "Préparation comptable", detail: "Justificatifs de la semaine prêts pour l'expert-comptable." },
    ],
    targets: [{ key: "encaisse", label: "Encaissé", unit: "eur" }],
  },
  "rh-people-ops": {
    routine: [
      { start: "09:00", end: "10:00", title: "Nouvelles candidatures", detail: "Chaque candidature lue, CV compris. Réponse sous 48h.", href: "/equipe/recrutement" },
      { start: "10:00", end: "12:00", title: "Entretiens", detail: "Sur la scorecard du poste : mission, résultats, non négociables.", href: "/equipe/agenda" },
      { start: "14:00", end: "15:30", title: "Intégration", detail: "Parcours des recrues en cours." },
      { start: "16:00", end: "17:00", title: "Réponses aux candidats", detail: "Positive ou négative, jamais laissée en attente." },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Nouvelle candidature", what: "Elle arrive seule dans ton pipeline. Fais-la avancer ou refuse-la avec une réponse.", where: "recrutement" },
      { when: "Entretien fixé", what: "Étape Entretien et le créneau dans l'agenda.", where: "agenda" },
      REPORT_RULE,
    ],
    rituals: [{ day: 1, title: "Postes ouverts", detail: "Où en est chaque recrutement, avec le fondateur." }],
    targets: [
      { key: "recrutes", label: "Recrutements", unit: "count" },
      { key: "entretiens", label: "Entretiens menés", unit: "count" },
    ],
  },
  "head-coach": {
    routine: [
      { start: "09:00", end: "09:45", title: "Cas difficiles", detail: "Litiges, résiliations, urgences à arbitrer." },
      { start: "10:00", end: "12:00", title: "Audits", detail: "Un échantillon de bilans et programmes, noté sur 10.", href: "/equipe/audits" },
      { start: "14:00", end: "15:30", title: "Formation des coachs", detail: "Points à corriger issus des audits." },
      { start: "16:00", end: "17:00", title: "Suivi de l'onboarding", detail: "Rétention J+30 de l'équipe.", href: "/equipe/equipe" },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Audit réalisé", what: "Étape Fait, note sur 10, points forts et à corriger.", where: "audits" },
      REPORT_RULE,
    ],
    rituals: [{ day: 1, title: "Plan d'audit de la semaine", detail: "Qui est audité, sur quoi." }],
    targets: [{ key: "audits", label: "Audits réalisés", unit: "count" }],
  },
  "coach-onboarding-success": {
    routine: [
      { start: "09:00", end: "10:00", title: "Nouveaux clients", detail: "Chaque client qui vient de payer arrive seul dans tes suivis : bienvenue sous 24h.", href: "/equipe/clients" },
      { start: "10:00", end: "11:30", title: "Suivis J+7", detail: "Premier bilan fait, première semaine lancée." },
      { start: "14:00", end: "15:30", title: "Suivis J+30", detail: "Toujours actif ou parti : c'est ce qui déclenche ta prime." },
      { start: "16:00", end: "16:30", title: "Frictions produit", detail: "Ce qui bloque les clients, remonté le jour même." },
      REPORT_BLOCK("17:30"),
    ],
    logRules: [
      { when: "Bienvenue faite", what: "Étape Suivi J+7 et prochain contact daté.", where: "clients" },
      { when: "À J+30", what: "Actif à J+30, ou Parti avant J+30 avec la raison.", where: "clients" },
      { when: "Friction repérée", what: "Dans la fiche du client, et remontée au Product Manager.", where: "clients" },
      REPORT_RULE,
    ],
    rituals: [{ day: 5, title: "Rétention de la semaine", detail: "Clients à risque et action prévue pour chacun." }],
    targets: [{ key: "actifs_j30", label: "Clients actifs à J+30", unit: "count" }],
  },
};

export function getPlaybook(roleKey: string): Playbook | null {
  return PLAYBOOKS[roleKey] ?? null;
}

/** Bloc en cours (ou le prochain de la journée) selon l'heure de Paris. */
export function routineNow(pb: Playbook, hhmm: string, isoDow: number): { current: RoutineBlock | null; next: RoutineBlock | null; dayOff: boolean } {
  if (isoDow > 5) return { current: null, next: null, dayOff: true };
  const current = pb.routine.find((b) => b.start <= hhmm && hhmm < b.end) ?? null;
  const next = pb.routine.find((b) => b.start > hhmm) ?? null;
  return { current, next, dayOff: false };
}
