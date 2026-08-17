# Croissance : acquisition, recrutement, contenu, parrainage

Chantier ouvert le 2026-08-16 suite à un cadrage de vision explicite (15
questions posées en `AskUserQuestion`, réponses résumées ci-dessous).
Différent de `VISION.md` (fonctionnalités produit pour les clients/coachs
déjà là) et de `LEADMAGNETS.md` (production de contenu) : celui-ci vise
directement le goulot d'étranglement business identifié par l'utilisateur,
pas l'app pour l'app.

## Le cadrage (verbatim résumé, 2026-08-16)

- Priorité générale : "tout, on a du temps donc fait tout" — mandat large,
  pas un seul axe exclusif.
- **Le vrai blocage business n'est ni la conversion ni le tunnel de
  paiement** : "c'est un problème d'acquisition et de communication, pas
  assez d'audience engagée sur Insta... la conversion derrière, setting et
  closing, ça je sais faire, mais y'a personne". Paiement déjà en place
  (Stripe, `lib/subscription-plans.ts`) mais 0 client payant au 2026-08-16,
  faute de trafic, pas faute de tunnel cassé.
- Canaux réels : Instagram/TikTok, parrainage/bouche-à-oreille, SEO via le
  contenu (lead magnets, déjà en cours, voir `LEADMAGNETS.md`).
- Organisation (19 postes, `lib/org-roles.ts`) : recrutement **réel et
  proche**, pas une structure de projection lointaine → page publique de
  candidature justifiée.
- Design : identité rouge sombre à garder intacte partout, y compris sur
  les nouvelles pages publiques.
- Lead magnets 1000 : continuent en tâche de fond, en parallèle, pas
  suspendus par ce chantier.
- Ordre d'exécution des chantiers : laissé à mon appréciation ("je te fais
  confiance, ordonne comme ça a du sens").

## Statut par chantier

### 1. Page lien en bio — abandonnée au profit de la page d'accueil (2026-08-17)
`/bio` a existé un temps (calculateurs + icône Instagram en pied de page)
puis a été corrigée une première fois (calculateurs retirés, icône
Instagram remplacée par un lien WhatsApp réel, `lib/brand-links.ts` →
`https://wa.me/33766834777`). Retour direct ensuite : "en vrai la page de
base c'est un peu déjà la même chose... on va rester sur la page de base
mais améliore-la pour augmenter le taux d'inscription". Décision : le lien
en bio Instagram pointe vers `/` (page d'accueil), pas `/bio`. La page
d'accueil a reçu deux ajouts pour ça : un lien vers `/reussites`
("vraies transformations") et un lien vers `/ressources` ("ressources
gratuites sans inscription"), tous deux en accent doré pour se distinguer
du CTA principal. `/bio` reste dans le code mais n'est plus la
destination active.

### 2. Candidatures publiques (`/carrieres`) — livré 2026-08-16
19 postes de l'organigramme (déplacés dans `lib/org-roles.ts`, source
unique partagée avec la page admin Organisation), statut de recrutement en
direct (`org_role_status`), formulaire nom/email/téléphone par poste
(`job_applications`, écriture via client admin, aucune session au moment
de la candidature). Inbox "Candidatures reçues" ajoutée à la page admin
Organisation avec statut cliquable (nouvelle/en discussion/refusée/
acceptée) et notification email au fondateur à chaque nouvelle
candidature.

### 3. Générateur de contenu social — refondu 2026-08-17 (sans appel IA)
Studio créatif (`/dashboard/coach/studio`) > onglet **Générateur**.
Version initiale (2026-08-16) appelait Claude Haiku côté serveur pour
générer un carrousel Instagram rendu via `next/og`. Retour direct : "le
truc génération enlève l'IA, moi je veux des prompts pour Claude (toi ou
Claude) hyper bien construits, et une petite partie à la fin où c'est moi
qui remplis sujet et angle". Récrit en `buildPrompt()`, une fonction pure
côté client (`components/coach/SocialGenerator.tsx`) : prend un guide déjà
publié (titre, accroche, intro, sections, conclusion), construit un prompt
complet prêt à coller dans Claude, avec Sujet/Angle éditables en bas.
Plus aucun appel réseau, plus de `ANTHROPIC_API_KEY` nécessaire pour cette
fonctionnalité. `app/api/social-carousel`, `studio/social-actions.ts` et
`lib/og-fonts.ts` supprimés (plus référencés nulle part).

### 4. Parrainage monétaire — livré 2026-08-16
Le programme de parrainage existait déjà (`referral_code`/`referred_by`,
item 41, points de gamification à l'inscription). Ajout d'une couche
monétaire réelle (`lib/referral-rewards.ts`) : quand un filleul devient
client payant (webhook Stripe `checkout.session.completed`), le parrain
reçoit un crédit de 500€ (un mois offert) sur son solde client Stripe,
appliqué automatiquement à sa prochaine facture. Idempotent (contrainte
unique sur `referred_id`) et gère l'ordre "j'invite avant même de payer
moi-même" (récompense `pending` créditée dès que le parrain obtient son
propre `stripe_customer_id`).

### 5. Landing pages dédiées par campagne — livré 2026-08-16, supprimé 2026-08-17
Existait un temps (`/c/[slug]`, `CampaignPagesManager.tsx`, table
`campaign_pages`). Retour direct : "landing page, ça sert à rien, c'est
nul, enlève". Supprimé entièrement (`app/c/`, `campaign-actions.ts`,
`CampaignPagesManager.tsx`, `lib/campaign-pages.ts`, table droppée en
migration après vérification qu'elle était vide). Aucune trace laissée
dans la nav ni le Studio créatif.

### 6. Organisation : onglets par pôle + 19 agents IA dans l'appli — livré 2026-08-17
Deux retours directs traités ensemble : "je vois toujours 0 changement
dans Organisation... mets-moi vraiment plusieurs onglets par pôle, des
boutons par métier avec un aperçu de mes agents IA, je veux pouvoir leur
assigner des tâches" et, la veille, "passe la nuit à configurer 19 agents
IA ultra compétents dans les 19 domaines de métier de mon entreprise,
avec nom, rôle, spécificités, compétences, contexte et tâches".
- `EQUIPE-IA.md` : les 19 personas complets en prose (référence,
  utilisable aussi en dehors de l'app, collé dans une conversation Claude).
- `lib/ai-agents.ts` : les mêmes 19 agents portés en données structurées
  (`AIAgent`), une clé par agent identique à la clé du poste dans
  `lib/org-roles.ts` — pas de mapping séparé à maintenir.
- Tables `ai_agent_messages`/`ai_agent_tasks` (RLS par `owner_id`), chat
  réel avec Claude Haiku (`app/dashboard/coach/admin/organisation/agents/
  actions.ts`, prompt système = celui de l'agent, non modifiable côté
  client) et gestion de tâches assignées (à faire/en cours/fait) par agent.
  Page dédiée par agent : `/dashboard/coach/admin/organisation/agents/
  [key]`.
- `components/ui/OrganisationView.tsx` : la section Pôles est passée d'un
  accordéon (5 blocs qui se ressemblaient, d'où le "0 changement") à de
  vrais onglets, un par pôle. Chaque carte de poste affiche son agent IA
  (nom, lien "Discuter · assigner une tâche") avec un badge de tâches
  ouvertes.
- Corrigé au passage : le lien "Retour" de la page Organisation (et de la
  page Leads, même bug) pointait vers `/dashboard/coach/admin` — qui est
  en fait la page "Coachs" dans la nav, pas un hub Administration. Les
  deux pointent maintenant vers `/dashboard/coach`, comme le fait déjà
  `/dashboard/coach/finance`. Le bouton "Page publique" (candidatures),
  mal placé à côté du titre sur mobile, est descendu sous le texte
  d'intro.

## Les chantiers du cadrage 2026-08-16 sont livrés (revus 2026-08-17)

`/carrieres` (+ inbox candidatures + checklist d'intégration + notes),
le Générateur de contenu social (version prompt, sans appel IA), le
parrainage monétaire, et Organisation (onglets par pôle + 19 agents IA en
chat direct) sont en production. `/bio` et les landing pages de campagne
ont été abandonnés en cours de route sur retour direct de l'utilisateur.
Ce qui reste, hors périmètre code, tient dans les notes ci-dessous.

## Notes pour une future session

- Aucun de ces chantiers ne fait grossir l'audience Instagram elle-même
  (hors du périmètre de ce qu'une app peut faire) — ils réduisent la
  friction une fois qu'il y a du trafic (bio, candidature) ou la friction à
  publier du contenu régulièrement (générateur). Le vrai levier de
  visibilité reste le recrutement d'un profil growth/content (poste
  `growth-traffic-manager`/`community-manager` dans l'organigramme),
  d'où la priorité donnée à `/carrieres`.
- `lib/brand-links.ts` : le numéro WhatsApp est réel (`33766834777`), mais
  `instagram.url`/`tiktok.url` restent des espaces réservés (`ep.coaching`)
  — sans conséquence tant que `/bio` n'est pas la destination active, mais
  à corriger avant de la réutiliser un jour.
