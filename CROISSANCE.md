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

### 1. Page lien en bio (`/bio`) — livré 2026-08-16
Destination unique pour le lien en bio Insta/TikTok, cinq blocs d'action
(rejoindre, coachs, réussites, ressources, outils). `lib/brand-links.ts`
centralise les comptes sociaux de la marque — **à compléter avec les
vraies URLs Instagram/TikTok**, actuellement des espaces réservés.

### 2. Candidatures publiques (`/carrieres`) — livré 2026-08-16
19 postes de l'organigramme (déplacés dans `lib/org-roles.ts`, source
unique partagée avec la page admin Organisation), statut de recrutement en
direct (`org_role_status`), formulaire nom/email/téléphone par poste
(`job_applications`, écriture via client admin, aucune session au moment
de la candidature). Inbox "Candidatures reçues" ajoutée à la page admin
Organisation avec statut cliquable (nouvelle/en discussion/refusée/
acceptée) et notification email au fondateur à chaque nouvelle
candidature.

### 3. Générateur de contenu social — livré 2026-08-16
Studio créatif (`/dashboard/coach/studio`) > onglet **Générateur**.
Transforme un guide déjà publié (lead magnet) en pack prêt à poster :
carrousel Instagram (généré à la volée par `app/api/social-carousel`, via
`next/og` + polices Montserrat chargées depuis Google Fonts au format
ttf), légende Instagram, post LinkedIn, et un prompt réutilisable à coller
ailleurs dans Claude pour une variante visuelle différente. Texte généré
par Claude Haiku (même intégration Anthropic que l'analyse de photo de
repas, `ANTHROPIC_API_KEY`).
**Limite connue** : seuls les lead magnets au format "guide" sont
supportés (checklist/quiz exclus pour l'instant, structure moins adaptée à
un carrousel).

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

### 5. Landing pages dédiées par campagne — pas commencé
Demandé mais pas encore livré : une page d'atterrissage ciblée par
campagne (ex. un lien spécifique pour une vidéo TikTok précise, avec son
propre message plutôt que la page d'accueil générique). À prioriser après
un premier retour d'usage sur `/bio` et `/carrieres`.

## Notes pour une future session

- Aucun de ces chantiers ne fait grossir l'audience Instagram elle-même
  (hors du périmètre de ce qu'une app peut faire) — ils réduisent la
  friction une fois qu'il y a du trafic (bio, candidature) ou la friction à
  publier du contenu régulièrement (générateur). Le vrai levier de
  visibilité reste le recrutement d'un profil growth/content (poste
  `growth-traffic-manager`/`community-manager` dans l'organigramme),
  d'où la priorité donnée à `/carrieres`.
- `lib/brand-links.ts` reste à compléter avec les vraies URLs sociales
  avant de pousser `/bio` en avant sur les réseaux.
