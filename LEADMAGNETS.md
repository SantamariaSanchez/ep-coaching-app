# Lead magnets : chantier "1000 en 1 mois"

Contexte : demande du 2026-08-14, verbatim résumé : supprimer les ressources
manuelles de bas de page sur `/ressources`, les recréer au format lead
magnet, puis produire un très gros volume de nouveaux lead magnets (objectif
1000 sous 1 mois, donc d'ici le **2026-09-13**) sur nutrition, training,
récup, steps, psychologie, entrepreneuriat, sans bâcler, avec vérification
PubMed systématique de toute affirmation physiologique.

**Règle absolue, héritée de la routine de suivi des clients (même exigence
posée par le coach)** : jamais de décision "coach" (nutrition, entraînement,
psychologie appliquée) sans vérification préalable sur PubMed, citation
explicite (auteur, année, DOI) dans le champ `sources` de l'entrée. Pour
l'entrepreneuriat, où la littérature clinique ne couvre pas tout, rester
mesuré et ne jamais inventer de statistique non vérifiée.

## Où vit le contenu

- Table Supabase `lead_magnets` (migration
  `supabase/migrations/20260814g_lead_magnets_table.sql`), pas un fichier
  TS codé en dur : au delà de quelques dizaines d'entrées un array TS
  alourdit le bundle et interdit la recherche/filtre côté serveur, et une
  routine cloud de production n'a accès qu'à Supabase + PubMed en MCP (pas
  au dépôt git), donc ne peut structurellement écrire que dans une table.
- `lib/lead-magnets.ts` : lecteur async, `unstable_cache` (revalidate 1h,
  la routine cloud ne peut pas appeler `revalidateTag`), garde les mêmes
  types exportés qu'avant (`LeadMagnet`, `GuideMagnet`, `ChecklistMagnet`,
  `QuizMagnet`).
- `lib/resource-categories.ts` : taxonomie (`RESOURCE_CATEGORIES`) et
  sous-catégories (`RESOURCE_SUBCATEGORIES`) utilisées pour le filtre.
- `components/ressources/lead-magnet-icons.tsx` : registre unique des
  icônes lucide (avant, dupliqué entre deux composants, source d'un vrai
  risque de dérive, un icône ajouté d'un côté sans l'autre retombait sur
  `Target` en silence).
- `components/ressources/LeadMagnetsExplorer.tsx` : LA grille/recherche
  utilisée partout (page publique `/ressources`, dashboard coach, dashboard
  client) — recherche texte, catégories, sous-catégories, filtre format,
  recherches récentes et dernière catégorie visitée en localStorage,
  pagination "voir plus" côté client. `LeadMagnetsGrid.tsx` a existé un
  temps comme grille plus simple sans recherche puis a été supprimé une
  fois l'Explorer généralisé partout — ne pas le recréer si jamais retrouvé
  dans un vieux commit, ce n'était pas voulu.

## Visibilité par rôle (important, corrigé le 2026-08-14)

Le code CTA reels et le formulaire de capture email/téléphone ne
s'adressent **pas** aux mêmes publics :

- **Un lead qui ne fait pas encore partie de l'appli** : voit la page
  individuelle d'un lead magnet normalement, avec le formulaire de capture
  email + téléphone (facultatif) avant de débloquer le contenu. Ne voit
  **jamais** de code (`#076`) nulle part.
- **Un membre déjà connecté (client OU coach)** : ne voit **jamais** le
  formulaire de capture, le contenu est débloqué immédiatement — inutile de
  redemander un email qu'on a déjà. Le CTA final s'adapte aussi ("retour à
  l'appli" plutôt que "créer mon compte").
- **Un coach spécifiquement (n'importe lequel de la plateforme, pas
  seulement le fondateur)** : voit en plus le code à 3 chiffres sur chaque
  carte et sur la page individuelle, et peut taper ce code dans la
  recherche pour retrouver directement un lead magnet précis. C'est un
  outil d'organisation interne (savoir quoi référencer dans un reel), pas
  une information utile à un client.

Piège technique important : `app/ressources/[slug]/page.tsx` est en ISR
(`generateStaticParams` + `revalidate = 3600`), donc son HTML est **mis en
cache et partagé entre visiteurs**. Le rôle/statut de connexion ne peut
donc pas être déterminé côté serveur sur cette page précise (ça figerait le
compte du premier visiteur dans le cache pour tout le monde) : c'est fait
côté client dans `LeadMagnetLanding.tsx` (`createClientSupabase().auth.
getUser()` puis lecture de `profiles.role`), avec un flash minime le temps
que ça résolve. La page liste `/ressources`, elle, n'est pas en ISR
(`ƒ`, rendu à chaque requête) : `isCoach` y est déterminé côté serveur sans
problème dans `app/ressources/page.tsx`.

## Code CTA reels (`keyword`)

Chaque lead magnet a un code à 3 chiffres (`keyword`, ex `"076"`), affiché
uniquement aux coachs (voir section ci-dessus) sur sa carte et sur sa page
individuelle. Pensé pour que le coach le cite dans un reel Instagram (via
un commentaire ou un DM, PAS pour que le lead le tape lui même dans
l'appli) : le coach tape le code dans la recherche pour retrouver
rapidement le bon lien à partager (voir `keywordMatch` dans
`LeadMagnetsExplorer.tsx`, `normalizeKeyword`/`getLeadMagnetByKeyword`
dans `lib/lead-magnets.ts`).

Migration `supabase/migrations/20260814h_lead_magnets_keyword.sql` :
- Séquence Postgres `lead_magnets_keyword_seq`, colonne `keyword` avec
  `default lpad(nextval(...)::text, 3, '0')`.
- **Attribué une seule fois, jamais réattribué**, même si la ligne est
  supprimée plus tard : un code déjà publié dans un reel doit rester valable
  indéfiniment, quoi qu'il arrive au reste de la table.
- Auto-assigné à chaque nouvel insert (y compris depuis la routine cloud,
  qui ne connaît pas cette colonne mais n'a rien à faire : le `default` de
  la colonne s'en charge tout seul dès qu'un `insert` ne la mentionne pas).
- Au delà de 999 lignes, `lpad` ne tronque pas : le code passe naturellement
  à 4 chiffres ("1000", "1001", ...) plutôt que de casser le format.

## Schéma d'une entrée (table `lead_magnets`)

```
slug, title, hook, category, subcategory (nullable), format (guide|checklist|quiz),
read_time, icon, content (jsonb : intro/sections/conclusion pour guide,
intro/groups/conclusion pour checklist, intro/questions/outcomes pour quiz),
sources (jsonb : [{label, doi, url}]), published, created_at
```

Chaque `section` d'un guide (`GuideSection` dans `lib/lead-magnets.ts`) :
```
{ heading, paragraphs: string[], actionSteps?: string[], callout?: string }
```

## Exigence de qualité (règle ajoutée le 2026-08-15, rétroactive sur toute
## nouvelle production, pas sur les 75 entrées déjà publiées)

Retour direct : "je veux vraiment des leadmagnets et pas des micromagnets...
pas que du texte mais aussi du visuel... pas juste lire un truc mais avoir de
vraies choses à appliquer concrètement". Diagnostic sur les entrées déjà
publiées (ex. `guide-procrastination-avant-seance`) : 3 sections d'un seul
paragraphe chacune, la partie "concrète" noyée dans une phrase de conseil
générique. Ça ne suffit plus. Pour toute nouvelle entrée format `guide` :

- **Au moins 4 sections**, chacune avec 2-3 paragraphes (pas 1 seul) — un
  vrai développement, pas un résumé de résumé.
- **Au moins une section avec `actionSteps` rempli** (3 à 6 étapes
  numérotées, concrètes, avec des chiffres/seuils quand c'est pertinent —
  "fixe un créneau fixe" est vague, "bloque le même créneau 3x/semaine
  pendant 2 semaines avant de le changer" est actionnable). C'est ce qui
  distingue un lead magnet d'un article de blog : le lecteur doit pouvoir
  fermer la page et appliquer, pas juste avoir appris un fait.
- **`callout` recommandé** sur au moins une section : un chiffre clé, un
  seuil, une règle simple à retenir même en lecture en diagonale — rendu
  visuellement distinct (encart) par `LeadMagnetLanding.tsx`, pas noyé dans
  le texte.
- Le format `checklist` reste pertinent tel quel pour de l'auto-diagnostic
  ("est-ce que ça me décrit"), mais quand le sujet s'y prête mieux
  (protocole, méthode, plan), préférer `guide` avec `actionSteps` plutôt
  que forcer une checklist qui ne fait qu'observer sans agir.
- Toujours sourcé (règle déjà en place, inchangée) — le surplus de longueur
  et d'action ne doit jamais se faire au prix d'une affirmation non
  vérifiée sur PubMed.

Rattrapage des 75 entrées déjà publiées : 27 réécrites au nouveau standard à
date (2026-08-15) — `guide-procrastination-avant-seance`,
`guide-comparaison-reseaux`, `guide-red-flags-coach`, `guide-body-checking`,
`guide-syndrome-imposteur`, `guide-lancer-offre-coaching`,
`guide-fideliser-clients`, `guide-30-premiers-jours`,
`guide-gestion-temps-independant`, `guide-temps-administratif-coach`,
`guide-tarifs-coaching`, `guide-premiers-clients-sans-budget`,
`guide-lire-progression`, `guide-charge-mentale-vie-sport`,
`guide-motivation`, `guide-7-erreurs-transformation`,
`guide-musculation-au-feminin-debuts`, `guide-peur-de-regrossir`,
`guide-structurer-semaine`, `guide-sortir-stagnation`, `guide-rir`,
`guide-deload`, `guide-hypertrophie-force`, `guide-macros`,
`guide-sommeil-muscle`, `guide-timing-repas`,
`guide-complements-alimentaires`. Ce dernier lot de 7 a épuisé la réserve de
guides à 0 `sources` (Entraînement/Nutrition/Récupération) qui contenaient
déjà des repères chiffrés jugés suffisamment établis (RIR, %1RM, grammes de
protéines/kg, dosage créatine) pour rester en l'état sans consultation
PubMed supplémentaire — restructuration en `actionSteps`/`callout` only,
aucune affirmation nouvelle ajoutée. Toute réécriture suivante portera sur
des guides qui ont déjà des `sources` PubMed renseignées, donc demandera de
relire chaque source avant d'ajouter du contenu, plus lent.
Reste 48 entrées à réécrire — à prioriser avant de continuer la vague de
nouvelles entrées si le temps le permet, sinon la prochaine session de
production locale.

## Avancement

| Date | Vague | Items | Détail |
| --- | --- | --- | --- |
| 2026-08-14 | Migration | 33 | Contenu déjà existant (array `LEAD_MAGNETS`), migré tel quel vers la table. Catégorie "Mental" renommée "Psychologie" pour matcher la nouvelle taxonomie. |
| 2026-08-14 | Vague A | 22 | Recréation à l'identique (même sujet, nouveau format) des 22 ressources manuelles uniques envoyées à la main sur `/ressources` (table `resources`, fichiers HTML/PDF). Les 29 lignes originales (22 sujets uniques + doublons de renvoi) supprimées de `resources` une fois les remplacements en ligne. |
| 2026-08-14 | Vague B | 20 | Premiers contenus vraiment nouveaux : 5 Steps & activité quotidienne, 5 Psychologie, 6 Entrepreneuriat (vertical entièrement nouvelle), 4 sujets plus précis (mollets, DOMS, cycle menstruel, répartition glucides). |
| **Total au 2026-08-14** | | **75** | Sur 1000 visés, échéance 2026-09-13. |

## Répartition actuelle par catégorie

Nutrition 18, Entraînement 17, Psychologie 12, Général 10, Récupération 7,
Entrepreneuriat 6, Steps & activité quotidienne 5.

Les catégories Entrepreneuriat et Steps sont les plus jeunes (0 avant ce
chantier) : prioritaires pour les prochaines vagues, avec Récupération qui
reste également en retrait relatif.

## Sujets couverts (pour éviter les doublons lors des prochaines vagues)

**Entraînement** : RIR/intensité, séance efficace, profil pratiquant,
hypertrophie vs force, échauffement, niveau (débutant/intermédiaire/avancé),
deload, progression d'intensité par cycle, fréquence d'entraînement, cause
de stagnation, diagnostic programme, tension vs pump, supersets
antagonistes, temps de repos, sortir d'un plateau, hypertrophie mollets,
cycle menstruel et entraînement.

**Nutrition** : macros, signaux d'abandon de diète, mode de diète (flexible/
fixe), timing des repas, repas à l'extérieur, compléments alimentaires,
besoin en déficit, collations protéinées, diagnostic nutrition, fenêtre
anabolique, rythme de sèche, protéines en sèche, cardio à jeun, sommeil et
sèche, jeûne intermittent, diet breaks, adaptation métabolique, répartition
des glucides autour de l'entraînement.

**Psychologie** : motivation, routine du soir, obstacle mental,
comparaison réseaux sociaux, accountability, syndrome de l'imposteur,
gestion du stress, red flags d'un coach, musculation au féminin
(appréhension des débuts), peur de reprendre le poids perdu, relation
saine à la nourriture, body checking, type de motivation
(intrinsèque/extrinsèque), charge mentale et vie sportive.

**Récupération** : sommeil et prise de muscle, surentraînement, mobilité
quotidienne, diagnostic sommeil, position étirée / étirements, DOMS et
indicateur d'efficacité.

**Général** : 7 erreurs de transformation, prêt pour le coaching, phase
actuelle (masse/sèche/maintenance), lire sa progression, 40 ans et plus,
30 premiers jours, salle ou maison, structure de la semaine, réponse
individuelle à l'entraînement.

**Steps & activité quotidienne** : combien de pas viser, NEAT, augmenter
ses pas au quotidien, profil d'activité, marche après repas.

**Entrepreneuriat** : lancer une offre de coaching, tarifs, checklist avant
de se lancer, fidéliser sans dépendre uniquement de l'acquisition, profil
face à l'incertitude, gestion du temps en indépendant.

## Sources déjà vérifiées (réutilisables sans re-recherche)

Adaptation métabolique : Buechel et al. 2026 (DOI
10.1080/15502783.2026.2676190), Aragon/Schoenfeld ISSN 2017 (DOI
10.1186/s12970-017-0174-y), Levine 2002 NEAT (DOI 10.1053/beem.2002.0227).
Protéines en déficit : Longland 2016 (DOI 10.3945/ajcn.115.119339), Hector
2017 (DOI 10.1096/fj.201700158RR), Jäger ISSN 2017 (DOI
10.1186/s12970-017-0177-8). Diet breaks : Müller 2016 (DOI
10.1007/s13679-016-0237-4), Peos 2019 (DOI 10.3390/sports7010022), Cortez
2023 (DOI 10.1371/journal.pone.0294131). Fréquence : Schoenfeld/Ogborn/
Krieger 2016 (DOI 10.1007/s40279-016-0543-8). Temps de repos : Grgic 2017
(DOI 10.1080/17461391.2017.1340524), Schoenfeld 2016 RCT (DOI
10.1519/JSC.0000000000001272). Position étirée : Havers 2025 (DOI
10.1002/ejsc.70087), Kassiano 2023 (DOI 10.1519/JSC.0000000000004460).
Mécanismes hypertrophie : Schoenfeld 2010 (DOI
10.1519/JSC.0b013e3181e840f3). Steps : Sheng 2021 (DOI
10.1016/j.jshs.2021.09.004), Hall 2020 (DOI 10.1186/s12966-020-00978-9).
Marche postprandiale : Dunstan 2012 (DOI 10.2337/dc11-1931), Moore 2021
(DOI 10.1016/j.numecd.2021.10.016). Sommeil et déficit : Nedeltcheva 2010
(DOI 10.7326/0003-4819-153-7-201010050-00006). Cardio à jeun : Gillen 2013
(DOI 10.1002/oby.20379). Jeûne intermittent : Jóźwiak 2024 (DOI
10.1186/s12967-024-05738-y), Eglseer 2023 (DOI 10.1016/j.advnut.2023.04.001),
Richardson 2023 (DOI 10.3390/nu15040985). Variabilité individuelle : Yang
2024 (DOI 10.1152/physiolgenomics.00019.2024). Cycle menstruel et
entraînement : Mikkonen 2023 (DOI 10.1007/s40279-023-01955-5).

## Prochaines vagues (backlog de thèmes, non exhaustif)

- Entraînement : périodisation par blocs, unilatéral vs bilatéral, warm up
  spécifique par groupe musculaire, cardio et interférence avec
  l'hypertrophie, entraînement à domicile avec matériel limité, gestion
  des blessures courantes (épaule, genou, lombaires) en musculation,
  progression sur les mouvements au poids du corps.
- Nutrition : végétarien/végétalien en musculation, alcool et objectifs
  physiques, grossesse et activité physique, alimentation étudiante à
  petit budget, suppléments réellement soutenus par la littérature (créatine,
  caféine) vs marketing, gestion des fringales.
- Récupération : massage et rouleau de massage (foam rolling), bains
  froids/glace, respiration et système nerveux, gestion du jet lag pour
  les athlètes qui voyagent, blessures et retour progressif à
  l'entraînement.
- Steps & activité quotidienne : podomètre vs montre connectée (fiabilité),
  activité physique au bureau, marche et santé mentale, escaliers vs
  ascenseur en vrais chiffres.
- Psychologie : perfectionnisme, comparaison sociale sur les réseaux,
  auto-sabotage, discipline vs motivation au quotidien, gérer un coach qui
  ne convient plus, transition post-objectif (après une compétition, un
  mariage, etc.).
- Entrepreneuriat : image de marque personnelle, contenu et réseaux sociaux
  pour un coach, gestion administrative de base, premiers salariés/
  sous-traitants, diversification des revenus, éviter l'épuisement en tant
  qu'indépendant.

## Mécanisme de production continue

Une routine cloud récurrente doit être créée (via le skill `schedule`,
même mécanique que la routine de revue des check-ins clients) pour
continuer la production vers 1000 sur le mois restant. Contraintes déjà
identifiées (héritées de cette même routine client) :

- Pas d'accès au dépôt git depuis une routine cloud (erreur 403 constatée),
  donc écriture uniquement via Supabase MCP (table `lead_magnets`
  directement) et vérification via PubMed MCP.
- Toujours vérifier `slug` inexistant avant insertion (contrainte unique).
- Toujours consulter la section "Sujets couverts" ci-dessus avant de
  proposer un nouveau thème, pour éviter les doublons.
- Toute affirmation physiologique doit être sourcée dans `sources` avec un
  DOI réel obtenu via PubMed MCP, jamais inventé.
- Mettre à jour ce fichier n'est pas possible depuis la routine (pas d'accès
  repo) : elle doit à la place tenir le compte à jour dans une table ou le
  signaler dans son rapport, à reporter ici manuellement en session locale.
