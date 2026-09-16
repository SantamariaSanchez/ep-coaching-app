# Écosystème élargi : contenu multi-plateformes, pub, outils coach

Chantier ouvert le 2026-09-16 suite à un mandat très large de l'utilisateur (retour
direct, résumé) : rattraper le retard sur la nutrition (tracking/log/coche/validation
qui doit fonctionner et se sauvegarder), ajouter une confirmation avec raison avant
suppression d'un script, construire un outil de suivi publicité (Google/Meta Ads),
pousser le tracking mailing (taux d'ouverture/clic), élargir très largement le contenu
produit (X, Reddit, WhatsApp Statut/Diffusion, Discord, Telegram, YouTube Communauté,
carrousels/stories Instagram avec une vraie cadence/process, pas juste la stratégie),
sans changer l'offre/le message/le client idéal, et repérer + corriger de soi-même
d'autres détails. Mandat explicite de travail long et autonome ("travaille minimum 1
jour entier"), reconduit après un incident Supabase découvert en cours de route (voir
Priorité 0).

Différent de `CROISSANCE.md` (acquisition/recrutement, cadré le 2026-08-16) : celui-ci
part d'une liste de demandes produit/contenu concrètes, pas d'un cadrage stratégique
par questions. Complémentaire de `VISION.md` (fonctionnalités produit) et
`LEADMAGNETS.md` (production des 1000 lead magnets, chantier séparé qui continue en
tâche de fond).

## Priorité 0 — Incident Supabase : quota atteint, reset le 2026-09-27

Découvert en cours de session : le compte Supabase (plan gratuit, projet
`cadmwvrsjklgtrrebflz`) a atteint son quota d'usage mensuel, avec un message de
Supabase annonçant une réinitialisation le 27/09. Effet direct constaté par
l'utilisateur : connexions refusées ("Identifiants incorrects") sur l'appli en
production.

**Cause probable trouvée et corrigée** : `components/ui/DashboardNav.tsx` déclenchait
un `router.prefetch()` de la totalité des 81 segments de navigation (coach + client
confondus, 30 à 50 pour un rôle donné) dès le montage du tableau de bord, à chaque
connexion de chaque utilisateur. Chaque prefetch force le rendu serveur complet de la
page visée, donc toutes ses requêtes Supabase, y compris pour des sections jamais
visitées. Avec seulement 14 comptes, c'est un poste de lecture largement démultiplié
par rapport à l'usage réel. Corrigé : seuls les 4 à 6 onglets toujours visibles restent
préchauffés, le reste retombe sur le comportement standard de Next.js (`<Link>`
préchauffe au survol/à l'affichage), sans rien perdre en réactivité perçue.

Un audit plus large (agent `supabase-usage-audit`, lancé le 2026-09-16) cherche
d'autres sources : polling trop fréquent, `select("*")` sur des tables à gros champs,
images non redimensionnées servies depuis Supabase Storage.

**Ce que ça ne résout pas** : le quota déjà consommé ce mois-ci reste bloqué jusqu'au
27/09, sauf passage en plan payant (Pro, ~25$/mois chez Supabase) — décision et paiement
qui reviennent à l'utilisateur, jamais pris à sa place.

**Conséquence sur la priorisation de ce chantier** : tant que le quota n'est pas
débloqué, aucune nouvelle routine cloud qui écrit en base n'est créée (voir section
Cadence contenu ci-dessous) pour ne pas aggraver la situation. Le travail de code local
(fixes, nouvelles fonctionnalités) continue normalement, rien n'est déployé qui
consomme plus de lectures/écritures que l'existant tant que ce n'est pas nécessaire.

## Statut par chantier

### 1. Nutrition : tracking/log/coche/validation des aliments, repas, recettes
En cours (agent `nutrition-fix`, lancé le 2026-09-16). Audit complet de
`ClientNutritionView.tsx`, des Server Actions nutrition (client + coach), et
vérification spécifique du pattern de démontage d'onglet interne (Axe CB de
`MASTERCLASS.md`, déjà corrigé à 5 endroits la veille, à vérifier si ce fichier était
un 6e cas oublié ou déjà sain par construction).

### 2. Suppression de script avec raison — livré 2026-09-16
`IdeationScripts.tsx` (Studio créatif) : un clic sur la corbeille ouvre désormais un
choix de raison (information fausse/dépassée, sujet qui n'intéresse pas, autre) avant
suppression réelle, au lieu d'un effacement direct. La raison est journalisée
(`coach_script_deletion_reasons`, migration `20260916c`) pour repérer plus tard les
piliers/angles les plus souvent rejetés — un signal pour la stratégie de contenu, pas
juste une confirmation UI.

### 3. Plateformes de contenu élargies — livré 2026-09-16
`coach_scripts.platform` (déjà du texte libre, aucune migration nécessaire) reconnaît
désormais des badges propres pour : Carrousel/Story Instagram, TikTok, Facebook,
Threads, YouTube Communauté, X (Twitter), Reddit, Statut/Chaîne WhatsApp, Discord,
Telegram, Pinterest, Twitch — en plus d'Instagram Reel/YouTube/LinkedIn déjà là. Chaque
script existant est retaggable directement (sélecteur sur le badge), et le formulaire
de création propose la plateforme dès l'écriture. Le Générateur de prompts (Studio
créatif) propose une case à cocher par plateforme, avec une consigne dédiée par format
(voir 🌐 Guide production contenu multi-plateformes dans Notion, créé le même jour).
`content_ideas` (pipeline d'idées, distinct des scripts) volontairement laissé à son
enum actuel (instagram/youtube/linkedin/general) : la granularité fine par plateforme
vit dans `coach_scripts`, `content_ideas` reste un brouillon de plus haut niveau.

### 4. Cadence carrousel/story — stratégie déjà là, process à créer
`📊 Stratégie Contenu Instagram — Funnel 50/25/25` (Notion) fixe déjà 1 carrousel/jour
et 5 stories/jour depuis le 2026-09-10. Ce qui manquait réellement : une routine cloud
qui produise ce volume, comme il en existe une pour les reels et une pour YouTube.
**Pas créée dans cet axe** (voir Priorité 0, aucune nouvelle routine tant que le quota
Supabase n'est pas débloqué) — à créer dès le 27/09 ou dès un passage en plan payant,
spec complète déjà écrite dans le guide Notion multi-plateformes, section "Cadence et
processus".

### 5. Publicité (Ads) : Google Ads / Meta Ads — en cours
Agent `ads-module`, lancé le 2026-09-16. Outil de pilotage MANUEL (pas d'intégration
API Google/Meta, hors scope pour l'instant, aucun credential disponible) : saisie des
campagnes, calcul de CPM/CPC/CTR/coût par lead, alertes visuelles sur les campagnes qui
sous-performent. Nouvelle entrée de nav dans le groupe "Mon business".

### 6. Mailing : tracking ouverture/clic — en cours
Agent `mailing-stats`, lancé le 2026-09-16. Lecture de l'API Brevo v3
(`GET /emailCampaigns/{id}`) pour afficher taux d'ouverture/clic/désabonnements par
campagne envoyée, à côté de l'historique déjà existant dans `CoachMailingComposer.tsx`.

### 7. Audit usage Supabase — en cours
Agent `supabase-usage-audit`, lancé le 2026-09-16, voir Priorité 0.

## Reste à faire (non démarré à la fin de la session du 2026-09-16)

- **Outils externes pour coach** (ManyChat, Calendly, Notion, etc. hors de l'app) :
  demande de l'utilisateur à clarifier — l'app a déjà des liens Calendly (prise de RDV)
  et Notion (contenu) en usage interne côté fondateur, mais rien d'exposé comme une
  vraie page de référence/checklist pour un coach qui rejoindrait la plateforme. À
  cadrer : une page "Boîte à outils" (liens + bonnes pratiques), pas une intégration
  API (trop lourd sans compte par coach à ce stade, un seul coach actif).
- **SEO** : pas audité cette session, à reprendre (voir `MASTERCLASS.md` pour les
  audits SEO précédents, notamment celui du 2026-08-16 sur `app/outils/page.tsx`).
- **Recherche approximative/tolérante aux fautes** sur toutes les barres de recherche :
  la recherche de `IdeationScripts.tsx` normalise déjà accents/casse mais reste une
  correspondance exacte par sous-chaîne (pas de tolérance aux fautes de frappe/lettres
  manquantes). Un utilitaire de recherche floue partagé (`lib/fuzzy-search.ts`,
  distance de Levenshtein tolérante) appliqué aux recherches à fort trafic (recettes,
  aliments, `CommandPalette`) serait la bonne prochaine étape, pas fait cette session
  par prudence (risque de régression sur plusieurs fichiers sans budget de vérification
  suffisant en fin de session).
- **Rétention des nouveaux inscrits** ("faire en sorte que les nouveaux inscrits
  reviennent") : pas traité cette session, à cadrer (onboarding déjà riche —
  `OnboardingTour.tsx`, `ClientOnboardingIntake.tsx`, quiz de personnalisation — mais
  pas de mesure du taux de retour J+1/J+7 ni de relance ciblée au-delà de ce qui existe
  déjà, `weekly-reengagement`/`free-tier-inactivity` cron).
- **Suivi data business coach** : `BusinessHub.tsx`/`BusinessDashboard.tsx` couvrent
  déjà Dashboard/Objectifs/Roadmap/Canvas/Funnel/Réseau/Checklist. Le mailing (axe 6)
  et la pub (axe 5) ci-dessus complètent ce suivi avec deux métriques qui manquaient
  réellement (email et pub). Pas identifié d'autre trou évident cette session.

## Session log

- **2026-09-16** — Ouverture du chantier, lancement en parallèle des agents
  nutrition-fix/ads-module/mailing-stats, livraison directe de la suppression de script
  avec raison et de l'élargissement des plateformes de contenu + guide Notion associé.
  Découverte en cours de route de l'incident quota Supabase, correctif DashboardNav
  livré, audit plus large lancé (`supabase-usage-audit`).
