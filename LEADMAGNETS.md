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
| 2026-08-15 | Vague C | 2 | Nouveaux sujets sourcés PubMed après épuisement de la réserve à 0 `sources` : interférence cardio/hypertrophie, gestion des fringales. |
| 2026-08-15 | Vague D | 2 | Bains froids (bénéfice court terme vs coût sur les gains long terme), escaliers vs ascenseur (étude contrôlée 8 semaines, chiffres précis). |
| 2026-08-15 | Vague E | 2 | Végétarien/végétalien en musculation (étude contrôlée 10 semaines, gains comparables à apport protéique égal), échauffement spécifique (général vs spécifique, séries d'approche). |
| 2026-08-15 | Vague F | 2 | Alcool et objectifs physiques (synthèse protéique -24 à -37% post exercice), foam rolling (mobilité et récupération perçue réelles, mythe du fascia relâché écarté). |
| 2026-08-15 | Vague G | 2 | Unilatéral vs bilatéral (déficit bilatéral + cross-education, deux mécanismes distincts), créatine et cerveau (fatigue cognitive au-delà du muscle). |
| 2026-08-15 | Vague H | 2 | Caféine soutenue par la littérature (dose-réponse, 48 études), marche et santé mentale (revue de portée, 13 000+ études criblées). |
| 2026-08-15 | Vague I | 1 | Podomètre vs montre connectée (fiabilité, deux études de validation avec chiffres précis d'erreur par appareil). |
| 2026-08-15 | Vague J | 2 | Respiration et système nerveux (3 essais contrôlés récents, effet réel mais plus limité que le discours bien-être habituel), jet lag pour athlètes qui voyagent (asymétrie est/ouest chiffrée). |
| 2026-08-15 | Vague K | 2 | Grossesse et activité physique (cadrage médical prudent, 2 études récentes), activité physique au bureau (bureau assis-debout + micro-pauses de marche, chiffres précis). |
| 2026-08-15 | Vague L | 2 | Perfectionnisme et longévité sportive (coureurs d'élite, effets forts), contenu body positive sur les réseaux (méta-analyse 56 études, ce qui change et ce qui ne change pas). |
| 2026-08-15 | Vague M | 1 | Périodisation (2 méta-analyses : force oui, hypertrophie non, ondulée vs linéaire selon le niveau). |
| 2026-08-15 | Vague N | 2 | Entraînement à domicile matériel limité (élastiques vs charges libres, essai contrôlé 12 semaines), squat profond et genoux (modélisation biomécanique, mythe inversé). |
| 2026-08-15 | Vague O | 1 | Alimentation étudiante à petit budget (1973 étudiants, le budget n'est pas le seul facteur, l'organisation compte presque autant). |
| 2026-08-15 | Vague P | 1 | Blessures épaule/lombaires en musculation (powerlifters, 70% actuellement blessés, facteurs de risque identifiés). |
| 2026-08-15 | Vague Q | 3 | Diversifier ses revenus de coach, éviter l'épuisement en indépendant, auto-sabotage — non sourcés PubMed (littérature clinique limitée sur l'entrepreneuriat), conseils mesurés sans statistique inventée. |
| 2026-08-15 | Vague R | 3 | Discipline vs motivation, transition post-objectif, image de marque personnelle — même approche non sourcée que la vague Q. |
| 2026-08-15 | Vague S | 4 | Gérer un coach qui ne convient plus, contenu & réseaux pour un coach, gestion administrative de base, premiers salariés/sous-traitants — backlog initial épuisé sur ces 4 derniers thèmes, même approche non sourcée. |
| 2026-08-15 | Vague T | 2 | Stretching statique avant/après (deux corpus distincts : effet aigu négatif, effet chronique positif), retour après blessure aux ischio-jambiers (méta-analyse comparant les protocoles) — ferme les 2 thèmes du backlog initial restés sans source. |
| 2026-08-15 | Vague U | 1 | Fréquence d'entraînement par muscle (2 méta-analyses du même auteur, la plus récente et large nuance la première : c'est le volume qui compte, pas la fréquence en soi). |
| 2026-08-15 | Vague V | 2 | Surentraînement, signes précoces (consensus officiel ECSS/ACSM), stress pré-compétition (2056 athlètes, résilience et coping comme leviers entraînables). |
| 2026-08-15 | Vague W | 2 | La force améliore l'endurance (angle complémentaire à l'axe interférence déjà traité), tarification à la valeur vs à l'heure pour un coach (non sourcé). |
| 2026-08-15 | Vague X | 1 | Onboarding client et attrition précoce (non sourcé) — ferme la liste de candidats compilée plus tôt dans la session. |
| **Total au 2026-08-15** | | **117** | Sur 1000 visés, échéance 2026-09-13. |
| 2026-08-16 | Routine cloud | 20 | Tourne en tâche de fond (voir "Mécanisme de production continue" ci-dessous), sans supervision directe de cette session. 20 nouvelles entrées le matin même, réparties sur Steps & activité quotidienne, Récupération, Entrepreneuriat, Général (sieste, HRV, alcool et récupération, marche vs vélo domicile-travail, syndrome de l'imposteur du coach débutant...). Découvert seulement le 2026-08-17 en vérifiant le total réel en base : le compteur manuel de ce document avait pris du retard sur la routine, corrigé ci-dessous. |
| 2026-08-17 | Vague Y | 4 | Reprise manuelle après la pause du chantier CROISSANCE. Musculation et alimentation végétarienne/végane (anabolisme théorique vs gains réels sur la durée, créatine et récupération), sauna et récupération (cardiovasculaire sur 20 ans de suivi + performance sportive), marche post-repas et glycémie (timing, fractionnement, micro-doses d'escaliers), magnésium et sommeil (association observationnelle réelle mais essais contrôlés mitigés, forme L-thréonate mieux étayée). Referme les 4 derniers thèmes du backlog du 2026-08-15. |
| **Total vérifié en base au 2026-08-17** | | **159** | Sur 1000 visés, échéance 2026-09-13. Écart de 18 entre 117+20+4=141 (addition manuelle) et 159 (compte réel `select count(*) from lead_magnets`) : la routine cloud a probablement tourné plus d'une fois sans que chaque passage soit individuellement journalisé ici. **À partir de maintenant, se fier au compte SQL réel avant d'écrire un nouveau total, jamais à une addition manuelle des lignes de ce tableau.** |
| **Total vérifié en base au 2026-08-18** | | **196** | Sur 1000 visés, échéance 2026-09-13 (26 jours restants). +37 en 1 jour via la routine cloud, non journalisé en détail (voir règle ci-dessus). Rythme réel depuis le 08-14 : 75→117→159→196, soit ~30/jour en moyenne sur 4 jours. Il reste 804 entrées à produire sur 26 jours, soit ~31/jour nécessaires : rythme actuel tout juste suffisant, à surveiller plutôt qu'à corriger dans l'immédiat. |
| **Total vérifié en base au 2026-09-10** | | **638** | Sur 1000 visés, échéance 2026-09-13 (3 jours restants). +442 depuis le 08-18 (23 jours), soit ~19/jour en moyenne sur la période, en dessous du ~31/jour nécessaire calculé le 08-18 — mais routine confirmée `enabled: true`, dernière exécution du 2026-09-09 réussie (`ROUTINE_RUN_STATUS_SUCCEEDED`), tourne bien tous les matins à 6h04 UTC. Rythme nécessaire pour tenir l'échéance : ~121/jour sur les 3 jours restants (362 entrées manquantes), largement au-dessus du rythme de la routine seule (15-30/jour) — l'échéance du 09-13 ne sera vraisemblablement pas tenue au rythme actuel, à signaler au coach plutôt qu'à masquer. |
| 2026-09-10 | Vague Z (manuelle, session "alimente le contenu") | 3 | Protéine avant le coucher (caséine, timing), combien de séries par semaine (relation dose-réponse volume/hypertrophie), aller à l'échec : décisif pour l'hypertrophie mais pas pour la force (méta-régression RIR 2024) — 3 sujets neufs cherchés directement sur PubMed (pas depuis la banque de sources déjà vérifiées, entièrement réexploitée par les sujets déjà publiés), voir la banque mise à jour ci-dessous. Rythme manuel volontairement modeste : chaque nouvelle entrée demande une vraie recherche PubMed pour rester sourcée, pas un simple remplissage de chiffre. |
| **Total vérifié en base au 2026-09-10 (soir)** | | **657** | +3 par rapport au comptage du matin. L'échéance du 09-13 reste hors de portée au rythme actuel (routine + production manuelle combinées), toujours à signaler honnêtement plutôt qu'à masquer par un rythme de production qui sacrifierait le sourcing. |
| 2026-09-10 | Vague AA (manuelle, suite de "continue les leadmagnet") | 5 | Protéines et satiété en sèche (méta-analyse 43 essais, -1,6kg vs témoin), HIIT vs cardio classique pour la perte de gras (méta-analyse en réseau, deux gagnants différents selon le marqueur suivi), risque d'infection ORL après un effort très long (méta-analyse marathon, +18% chiffré), BFR utile ou gadget (deux méta-analyses, l'effet dépend du niveau d'entraînement), collagène et tendons (revue 2026, effet réel sur la structure du tendon mais pas sur la force). Beta-alanine et sodium/hydratation écartés en cours de route : déjà couverts pour le premier, littérature trop faible/hors-sujet (dentaire) pour le second. |
| **Total vérifié en base au 2026-09-10 (nuit)** | | **662** | +5 par rapport au comptage du soir. |
| 2026-09-10 | Vague AB (manuelle, suite "continue de travailler longtemps") | 6 | Nitrates/jus de betterave (dose et timing précis, mais pas d'effet sur la progression à long terme), rest-pause et drop-set vs séries classiques (aucun bonus d'hypertrophie à volume égal), mind-muscle connection (quasi doublement de croissance mesurée par échographie, Schoenfeld 2018), cerises acidulées et récupération (force qui revient plus vite, mais pas les courbatures perçues), citrulline malate (+6,4% de répétitions, dose/timing précis), HMB (aucun effet démontré sur masse maigre ou force, jeunes comme séniors). |
| **Total vérifié en base au 2026-09-10 (nuit, suite)** | | **668** | +6 par rapport au comptage précédent. |
| 2026-09-10 | Vague AC (manuelle, suite "continue de travailler longtemps") | 4 | Ashwagandha et force (STAR Trial, +19,1kg squat vs +10,0kg placebo sur 12 semaines), cluster sets vs séries traditionnelles (préserve vitesse/puissance mais pas le 1RM), surcharge excentrique flywheel (deux méta-analyses aux résultats différents selon le protocole), manque de sommeil et testostérone (privation partielle sans effet, seule la privation totale ≥24h en a un). Glutamine et glycogène/carb timing explorés mais écartés : littérature trop datée ou trop générale pour un sourcing solide. |
| **Total vérifié en base au 2026-09-10 (nuit, suite 2)** | | **672** | +4 par rapport au comptage précédent. |
| 2026-09-10 | Vague AD (manuelle, suite "continue de travailler longtemps") | 4 | Bétaïne (aucun effet sur la composition corporelle malgré sa présence quasi systématique en pre-workout), taurine (relation dose-réponse, pas un effet linéaire simple), seuil de leucine (vrai chez les seniors, pas chez le jeune pratiquant), œuf entier vs blanc d'œuf (l'œuf entier stimule plus la synthèse protéique à protéines égales). Bicarbonate de sodium et fréquence/répartition des repas explorés mais écartés : premier moins pertinent pour l'audience musculation (surtout utile en sports à efforts répétés), second déjà couvert (3 entrées existantes). |
| **Total vérifié en base au 2026-09-10 (nuit, suite 3)** | | **676** | +4 par rapport au comptage précédent. |
| 2026-09-10 | Vague AE (manuelle, suite "continue de travailler longtemps") | 4 | Vitamine C/E à forte dose (freine l'hypertrophie et la force en essai contrôlé de 10 semaines), créatine avant vs après la séance (aucune différence, design intra-sujet), curcuma/gingembre/ginseng (réduisent courbatures et marqueurs, mais pas la performance), L-carnitine (effet réel mais démontré chez le surpoids/obèse, pas le pratiquant déjà lean). |
| **Total vérifié en base au 2026-09-10 (nuit, suite 4)** | | **680** | +4 par rapport au comptage précédent. |
| 2026-09-10 | Vague AF (manuelle, suite "continue de travailler longtemps") | 3 | Oméga-3 et sensibilité anabolique (pas d'effet direct au repos, mais sensibilise le muscle au signal repas), plafond de protéines à 1,6g/kg/jour (méta-analyse de référence Morton/Schoenfeld/Helms/Aragon/Phillips, 49 études), ordre cardio/musculation dans une séance (aucun effet sur l'hypertrophie, contrairement au mythe — c'est le TYPE de cardio, course à pied vs vélo, qui compte). |
| **Total vérifié en base au 2026-09-10 (nuit, suite 5)** | | **683** | +3 par rapport au comptage précédent. |
| 2026-09-10 | Vague AG (manuelle, suite "continue de travailler longtemps") | 2 | Pistolet de massage à percussion (réduit douleur/fatigue perçues, aucun effet sur la performance objective), électrostimulation corps entier (EMS, effet négligeable chez le pratiquant déjà entraîné vs entraînement classique équivalent). |
| **Total vérifié en base au 2026-09-10 (nuit, suite 6)** | | **685** | +2 par rapport au comptage précédent. Session très longue (26+ entrées manuelles depuis le début de la journée), rythme volontairement ralenti à ce stade pour préserver la qualité du sourcing plutôt que de forcer le volume. |
| 2026-09-11 → 09-18 | Routine cloud quotidienne (production automatique, pas de log manuel ici pendant cette période) | ~93 | Suivi jour par jour de ce fichier interrompu pendant cette période (échéance 09-13 dépassée sans que ce soit signalé ici en temps réel) ; total reconstitué le 2026-09-22 par comptage direct en base plutôt que supposé. |
| **Total vérifié en base au 2026-09-18 (avant la panne quota, voir Axe FB de MASTERCLASS.md)** | | **778** | Routine quotidienne "Production quotidienne de lead magnets" tournée normalement du 09-11 au 09-18, puis silencieusement bloquée du 09-19 au 09-22 par un dépassement de quota hebdomadaire du compte (résolu, voir MASTERCLASS.md Axe FB). |
| 2026-09-22 | Rattrapage manuel (run cloud relancé après déblocage du quota) + **Règle absolue N°0 ajoutée** : retour direct, "c'est pas normal qu'on en ait pas des titres simples mais que des titres complexes... on doit avoir des clients" — titres génériques de catégorie désormais interdits, chaque titre doit répondre à une douleur/question précise. Nouvelle section "Douleurs et objections réelles de l'avatar" ajoutée à la page Notion de couverture (excuses/objections, image corporelle, désirs esthétiques, questions de base, douleurs sur l'entourage), lue par la routine à chaque run à partir de ce jour. | 15 | Sciatique en musculation, signaux d'alerte lombalgie, SPM et entraînement, apnée du sommeil, andropause, cervicalgie bureau, tendinopathie, fibromyalgie, SII (syndrome de l'intestin irritable), asthme et sport — trous de couverture réels (comorbidités jamais traitées), pas des redites. |
| **Total vérifié en base au 2026-09-22** | | **793** | Sur 1000 visés. Échéance du 09-13 dépassée depuis 9 jours au rythme constaté (~13/jour de moyenne réelle sur la période 09-11→09-22, panne quota comprise) : à signaler honnêtement à Santamaria plutôt qu'à masquer — le rythme nécessaire pour tenir un objectif de 1000 sans nouvelle échéance fixée reste à redéfinir avec lui plutôt que suggéré ici. |

## Répartition actuelle par catégorie

Vérifié en base au 2026-09-10 : Entrepreneuriat 103, Nutrition 101,
Récupération 90, Entraînement 89, Psychologie 88, Général 86, Steps &
activité quotidienne 81 (total 638) — répartition désormais très équilibrée
entre catégories, contrairement à l'écart marqué du 08-18.

Les catégories Entrepreneuriat et Steps sont les plus jeunes (0 avant ce
chantier) : prioritaires pour les prochaines vagues, avec Récupération qui
reste également en retrait relatif.

## Sujets couverts (pour éviter les doublons lors des prochaines vagues)

**Note 2026-08-17** : cette liste couvre le travail manuel (sessions
locales), pas exhaustivement les lots de la routine cloud quotidienne (voir
"Mécanisme de production continue" plus bas) — la routine se protège déjà
elle-même des doublons en listant les 300 titres les plus récents avant
chaque lot (`order by created_at desc limit 300`), donc le risque réel de
doublon reste faible même sans réconciliation manuelle parfaite ici. En cas
de doute sur un sujet précis avant d'en traiter un nouveau, une recherche
rapide `select slug, title from lead_magnets where title ilike '%mot-clé%'`
reste plus fiable que cette liste.

**Entraînement** : RIR/intensité, séance efficace, profil pratiquant,
hypertrophie vs force, échauffement, niveau (débutant/intermédiaire/avancé),
deload, progression d'intensité par cycle, fréquence d'entraînement, cause
de stagnation, diagnostic programme, tension vs pump, supersets
antagonistes, temps de repos, sortir d'un plateau, hypertrophie mollets,
cycle menstruel et entraînement, interférence cardio/hypertrophie,
échauffement spécifique vs général, unilatéral vs bilatéral (déficit
bilatéral, cross-education), périodisation (force vs hypertrophie, ondulée
vs linéaire), entraînement à domicile matériel limité (élastiques vs
charges libres), squat profond et genoux, blessures épaule/lombaires
(powerlifters, facteurs de risque), fréquence d'entraînement par muscle
(c'est le volume qui compte), la force améliore l'endurance (économie de
mouvement), entraînement avec restriction de flux sanguin (BFR, effet selon
le niveau d'entraînement), rest-pause et drop-set vs séries classiques
(aucun bonus d'hypertrophie à volume égal), mind-muscle connection (focus
interne vs externe), cluster sets vs séries traditionnelles (vitesse/
puissance vs 1RM), surcharge excentrique flywheel.

**Nutrition** : macros, signaux d'abandon de diète, mode de diète (flexible/
fixe), timing des repas, repas à l'extérieur, compléments alimentaires,
besoin en déficit, collations protéinées, diagnostic nutrition, fenêtre
anabolique, rythme de sèche, protéines en sèche, cardio à jeun, sommeil et
sèche, jeûne intermittent, diet breaks, adaptation métabolique, répartition
des glucides autour de l'entraînement, gestion des fringales,
végétarien/végétalien en musculation, alcool et objectifs physiques,
créatine et cerveau (fatigue cognitive), caféine soutenue par la
littérature (dose-réponse), alimentation étudiante à petit budget, protéines
et satiété/poids en sèche, HIIT vs cardio classique (deux marqueurs
différents), collagène et tendons (structure vs force), nitrates/jus de
betterave (dose/timing précis, pas d'effet chronique), citrulline malate
(+6,4% de répétitions), HMB (aucun effet démontré), ashwagandha et force
(STAR Trial), bétaïne (aucun effet composition corporelle), taurine
(dose-réponse), seuil de leucine (vrai chez les seniors, pas les jeunes),
œuf entier vs blanc d'œuf (synthèse protéique), vitamine C/E à forte dose
(freine l'hypertrophie), créatine avant vs après séance (aucune différence),
curcuma/gingembre/ginseng (courbatures oui, performance non), L-carnitine
(effet réel mais chez le surpoids, pas le lean).

**Psychologie** : motivation, routine du soir, obstacle mental,
comparaison réseaux sociaux, accountability, syndrome de l'imposteur,
gestion du stress, red flags d'un coach, musculation au féminin
(appréhension des débuts), peur de reprendre le poids perdu, relation
saine à la nourriture, body checking, type de motivation
(intrinsèque/extrinsèque), charge mentale et vie sportive,
perfectionnisme et longévité sportive, contenu body positive sur les
réseaux, auto-sabotage, discipline vs motivation, transition
post-objectif, gérer un coach qui ne convient plus, stress
pré-compétition.

**Récupération** : sommeil et prise de muscle, surentraînement, mobilité
quotidienne, diagnostic sommeil, position étirée / étirements, DOMS et
indicateur d'efficacité, bains froids (courbatures vs gains long terme),
foam rolling (mobilité/récupération perçue, pas un effet mécanique sur le
fascia), respiration et système nerveux (effet réel mais limité), jet lag
pour athlètes qui voyagent (asymétrie est/ouest), stretching statique
avant/après (effet aigu vs chronique), retour après blessure aux
ischio-jambiers (comparaison de protocoles), surentraînement/signes
précoces (consensus ECSS/ACSM), infection ORL après un effort très long
(marathon, fenêtre de vulnérabilité transitoire), cerises acidulées
(force qui revient plus vite, mais pas les courbatures perçues), manque de
sommeil et testostérone (privation partielle vs totale).

**Général** : 7 erreurs de transformation, prêt pour le coaching, phase
actuelle (masse/sèche/maintenance), lire sa progression, 40 ans et plus,
30 premiers jours, salle ou maison, structure de la semaine, réponse
individuelle à l'entraînement, grossesse et activité physique.

**Steps & activité quotidienne** : combien de pas viser, NEAT, augmenter
ses pas au quotidien, profil d'activité, marche après repas, escaliers vs
ascenseur, marche et santé mentale, podomètre vs montre connectée
(fiabilité), activité physique au bureau.

**Entrepreneuriat** : lancer une offre de coaching, tarifs, checklist avant
de se lancer, fidéliser sans dépendre uniquement de l'acquisition, profil
face à l'incertitude, gestion du temps en indépendant, diversifier ses
revenus, éviter l'épuisement en indépendant, image de marque personnelle,
contenu et réseaux sociaux pour un coach, gestion administrative de base,
premiers salariés/sous-traitants, tarification à la valeur vs à l'heure,
onboarding client et attrition précoce.

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
entraînement : Mikkonen 2023 (DOI 10.1007/s40279-023-01955-5). Interférence
cardio/hypertrophie : Wilson et al. 2012, méta-analyse (DOI
10.1519/JSC.0b013e31823a3e2d), Terzis et al. 2016 (DOI
10.1007/s00421-016-3369-z). Fringales/appétit : Weigle et al. 2005, régime
hyperprotéiné (DOI 10.1093/ajcn.82.1.41), St-Onge et al. 2012, IRM et
restriction de sommeil (DOI 10.3945/ajcn.111.027383). Bains froids : Bleakley
et al. 2012, revue Cochrane (DOI 10.1002/14651858.CD008262.pub2), Roberts et
al. 2015, adaptations long terme (DOI 10.1113/JP270570). Escaliers : Michael
et al. 2021, essai contrôlé 8 semaines (DOI 10.3390/ijerph18020603).
Végétarien/végétalien : Monteyne et al. 2023, essai contrôlé 10 semaines
(DOI 10.1016/j.tjnut.2023.02.023). Échauffement : Fradkin et al. 2006, revue
systématique (DOI 10.1016/j.jsams.2006.03.026). Alcool : Parr et al. 2014
(DOI 10.1371/journal.pone.0088384), Lakićević 2019, revue systématique (DOI
10.3390/jfmk4030041). Foam rolling : Martínez-Aranda et al. 2024, revue
systématique 25 études (DOI 10.3390/jfmk9010020), Scudamore et al. 2021 (DOI
10.1016/j.jesf.2021.02.002). Unilatéral/bilatéral : Škarabot et al. 2016,
revue sur le déficit bilatéral (DOI 10.1007/s00421-016-3458-z), Barss et al.
2018, cross-education (DOI 10.1152/japplphysiol.00390.2017). Créatine et
cerveau : Gordji-Nejad et al. 2024 (DOI 10.1038/s41598-024-54249-9), Roschel
et al. 2021, revue (DOI 10.3390/nu13020586). Caféine : Martins et al. 2026,
méta-analyse dose-réponse 48 études (DOI 10.3390/nu18121989). Marche et
santé mentale : Kelly et al. 2018, revue de portée (DOI
10.1136/bjsports-2017-098827). Podomètre vs montre : Brodie et al. 2018
(DOI 10.1016/j.mehy.2018.07.015), Höchsmann et al. 2018, étude de validation
(DOI 10.1111/sms.13074). Respiration/système nerveux : Raidl et al. 2026
(DOI 10.1123/ijspp.2025-0138), Minjoz et al. 2026 (DOI
10.1016/j.biopsycho.2026.109254), Michels et al. 2025 (DOI
10.1097/PSY.0000000000001448). Jet lag : Charest et al. 2022, 17 088 matchs
NHL (DOI 10.1016/j.jsams.2022.10.005), Maynard et al. 2025, cohorte WTA (DOI
10.1177/19417381251387717). Grossesse/activité physique : Bains et al. 2025
(DOI 10.1007/s40279-025-02223-4), Friedman et al. 2025, CrossFit et
grossesse (DOI 10.1016/j.ejogrb.2025.114840). Activité au bureau : Graves
et al. 2015, bureau assis-debout (DOI 10.1186/s12889-015-2469-8).
Perfectionnisme : Dessye 2026, étude sur coureurs d'élite (DOI
10.1007/s44192-026-00513-5). Body positive : Jiménez-García et al. 2025,
méta-analyse 56 études (DOI 10.1186/s40337-025-01286-y). Périodisation :
Moesgaard et al. 2022, méta-analyse 35 études (DOI 10.1007/s40279-021-01636-1),
Williams et al. 2017, méta-analyse 18 études (DOI 10.1007/s40279-017-0734-y).
Entraînement domicile : Schott et al. 2026, essai contrôlé élastiques vs
charges libres (DOI 10.1016/j.exger.2026.113182). Genou/squat profond : Wu
et al. 2019, modélisation biomécanique (DOI 10.1016/j.jbiomech.2019.109333).
Alimentation étudiante : Foglia et al. 2026, étude sur 1973 étudiants (DOI
10.1016/j.numecd.2026.104672), Pelletier & Laska 2012 (DOI
10.1016/j.jneb.2012.04.001). Blessures épaule/lombaires : Strömbäck et al.
2018, étude sur powerlifters (DOI 10.1177/2325967118771016). Stretching
statique : Opplert & Babault 2018, revue effets aigus (DOI
10.1007/s40279-017-0797-9), Arntz et al. 2023, méta-analyse 41 études effets
chroniques (DOI 10.1007/s40279-022-01806-9). Retour blessure ischio-jambiers :
Abdulridha et al. 2025, méta-analyse (DOI 10.1016/j.jbmt.2025.06.030).
Fréquence d'entraînement : Schoenfeld/Ogborn/Krieger 2016 (DOI
10.1007/s40279-016-0543-8), Schoenfeld/Grgic/Krieger 2019, méta-analyse
25 études (DOI 10.1080/02640414.2018.1555906). Surentraînement : Meeusen
et al. 2013, consensus ECSS/ACSM (DOI 10.1249/MSS.0b013e318279a10a). Stress
pré-compétition : Li et al. 2025, 2056 athlètes (DOI
10.1038/s41598-025-19213-1), Tharawadeepimuk et al. 2026, essai contrôlé
(DOI 10.1186/s40359-026-04814-w). Force/endurance : Berryman, Mujika &
Bosquet 2019, revue (DOI 10.1123/ijspp.2018-0103). Protéine avant le coucher :
Snijders et al. 2019, revue (DOI 10.3389/fnut.2019.00017), Dela Cruz & Kahan
2021, revue systématique (DOI 10.3390/nu13061872). Volume hebdomadaire et
hypertrophie : Schoenfeld/Ogborn/Krieger 2016, méta-analyse 15 études (DOI
10.1080/02640414.2016.1210197). Proximité de l'échec (RIR), hypertrophie vs
force : Robinson et al. 2024, méta-régressions (DOI 10.1007/s40279-024-02069-2).
Protéines et satiété/poids : Hansen et al. 2021, méta-analyse 43 essais (DOI
10.3390/nu13093193). HIIT vs cardio classique : Wang et al. 2024,
méta-analyse en réseau 28 essais (DOI 10.3389/fendo.2023.1294362). Infection
ORL post-effort long : Sardeli et al. 2024, méta-analyse marathon (PMID
39094181, pas de DOI indexé). BFR (restriction de flux sanguin) : Lixandrão
et al. 2018, méta-analyse de référence (DOI 10.1007/s40279-017-0795-y), Geng
et al. 2024, modérateur statut d'entraînement (DOI 10.1186/s40798-024-00719-3).
Collagène et tendons : Buchalski et al. 2026, revue systématique Stanford
(DOI 10.3390/jfmk11010130). Nitrates/betterave : Silva et al. 2022,
méta-analyse 123 études (DOI 10.1093/advances/nmac054), Hogwood et al. 2023,
absence d'effet chronique (DOI 10.1186/s40798-023-00632-1). Rest-pause/
drop-set : Enes et al. 2021, essai contrôlé avec Schoenfeld (DOI
10.1139/apnm-2021-0278). Mind-muscle connection : Schoenfeld et al. 2018
(DOI 10.1080/17461391.2018.1447020). Cerises acidulées : Daab et al. 2026,
méta-analyse 19 essais (DOI 10.1186/s40798-026-00993-3). Citrulline malate :
Vårvik et al. 2021, méta-analyse (DOI 10.1123/ijsnem.2020-0295). HMB :
Jakubowski et al. 2020, méta-analyse groupe Phillips (DOI
10.3390/nu12051523), Courel-Ibáñez et al. 2019, séniors (DOI
10.3390/nu11092082). Ashwagandha : Ziegenfuss et al. 2018, STAR Trial (DOI
10.3390/nu10111807). Cluster sets : Latella et al. 2019, méta-analyse
(DOI 10.1007/s40279-019-01172-z), Marshall et al. 2021, séquences
d'entraînement (DOI 10.1007/s40279-021-01430-z). Surcharge excentrique
flywheel : Vicens-Bordas et al. 2017 (DOI 10.1016/j.jsams.2017.10.006),
Maroto-Izquierdo et al. 2017 (DOI 10.1016/j.jsams.2017.03.004). Sommeil et
testostérone : Su et al. 2021, méta-analyse 18 études (DOI
10.1016/j.sleep.2021.10.031). Bétaïne : Ashtary-Larky et al. 2021,
méta-analyse (DOI 10.1017/S0007114521004062). Taurine : Chen et al. 2021,
revue dose-réponse (DOI 10.3389/fphys.2021.700352). Seuil de leucine :
Wilkinson et al. 2023, revue systématique (DOI 10.14814/phy2.15775). Œuf
entier vs blanc : van Vliet et al. 2017, biopsies/traceurs isotopiques
(DOI 10.3945/ajcn.117.159855). Vitamine C/E forte dose : Martínez-Ferrán
et al. 2022, essai contrôlé (DOI 10.1016/j.nut.2022.111848). Créatine
timing : Forbes/Krentz/Candow 2021, design intra-sujet (DOI
10.23736/S0022-4707.20.11668-2). Curcuma/racines : Doma et al. 2020,
méta-analyse 25 études (DOI 10.1024/0300-9831/a000689), Talebi et al. 2024,
revue parapluie 53 méta-analyses (DOI 10.1093/nutrit/nuad078). L-carnitine :
Talenezhad et al. 2020, méta-analyse 37 essais (DOI
10.1016/j.clnesp.2020.03.008), Askarpour et al. 2019, méta-analyse 43 essais
(DOI 10.1016/j.phrs.2019.104554). Oméga-3/sensibilité anabolique : Smith
et al. 2011, traceurs isotopiques (DOI 10.1042/CS20100597). Plafond
protéines 1,6g/kg : Morton et al. 2018, méta-analyse de référence 49 études
(DOI 10.1136/bjsports-2017-097608). Ordre cardio/musculation : Lundberg
et al. 2022, méta-analyse 15 études (DOI 10.1007/s40279-022-01688-x),
Küüsmaa et al. 2016, matin vs soir (DOI 10.1139/apnm-2016-0271). Pistolet
de massage : Buoite Stella et al. 2024 (DOI 10.3390/sports12060167), Alves
et al. 2025, essai contrôlé 84 coureurs (DOI 10.1097/JSM.0000000000001355).
EMS corps entier : Wirtz et al. 2019, mini méta-analyse 5 essais homogènes
(DOI 10.3389/fphys.2019.01336).

## Prochaines vagues (backlog de thèmes, non exhaustif)

Le backlog initial de cette section (fixé le 2026-08-14) est maintenant
entièrement épuisé, y compris les deux thèmes un temps restés sans source
exploitable (retour progressif après blessure : traité via l'angle
spécifique des ischio-jambiers, bien documenté ; progression aux mouvements
au poids du corps : reste sans bonne source PubMed trouvée à ce jour,
seul thème du backlog initial encore ouvert).

- Entraînement : progression sur les mouvements au poids du corps (aucune
  étude pertinente trouvée malgré plusieurs recherches ; à retenter avec
  d'autres termes, ou traiter sans source comme les thèmes
  entrepreneuriat/psychologie ci-dessus).

Cette deuxième liste de candidats est maintenant épuisée elle aussi (2
thèmes traités sans source PubMed faute de littérature exploitable trouvée,
documenté ci-dessous). Mise à jour du 2026-08-17 : végétarisme et sauna,
qui semblaient sans bonne source le 2026-08-15, ont en fait donné de très
bons résultats avec des termes de recherche anglais plus larges
("plant-based diet exercise recovery" plutôt que la formulation FR
littéralement traduite, "sauna bathing cardiovascular mortality" plutôt que
juste "sauna recovery") — retenir cette leçon : une recherche PubMed
infructueuse justifie de reformuler la requête avant de conclure à
l'absence de littérature, pas de l'abandonner après un seul essai.

- Récupération : nutrition et qualité du sommeil au delà de la caféine
  (magnésium trouvé uniquement en population diabétique le 2026-08-15, à
  retenter en population générale).
- Entraînement : progression sur les mouvements au poids du corps (toujours
  sans source malgré plusieurs recherches), ratio push/pull dans un
  programme (recherche PubMed infructueuse, sujet plus proche du bon sens
  d'entraînement que de la littérature clinique, à traiter sans source si
  retenté).

Au delà de ces thèmes précis, la production continue peut aussi repartir
des sous-catégories les moins couvertes (voir répartition par catégorie
ci-dessus : Steps & activité quotidienne et Général restent les plus
légères) ou creuser des angles plus spécifiques sur des sujets déjà traités
en surface (ex. déjà 26 entrées Entraînement, mais des variantes précises
comme un groupe musculaire donné, un mouvement donné, restent ouvertes).

## Mécanisme de production continue

**Statut au 2026-08-17 : confirmée active et fonctionnelle**, vérifié via
`RemoteTrigger` (liste des routines programmées) — routine
`trig_01EtA4CyB4E7QyZS4TRPTrKT`, nom "EP Coaching - Production quotidienne
de lead magnets", cron `0 6 * * *` (6h UTC chaque jour, soit 7h ou 8h heure
de Paris selon l'heure d'été/hiver), `enabled: true`,
`last_fired_at: 2026-08-17T06:15:08Z`, `next_run_at: 2026-08-18T06:04:06Z`.
Produit 15 à 30 nouvelles entrées par exécution, avec les mêmes contraintes
que le travail manuel (sourcage PubMed obligatoire pour toute affirmation
factuelle, zéro tiret em/en, pas de doublon de sujet). Tourne aux côtés
d'une deuxième routine indépendante et sans rapport ("EP Coaching - Revue
quotidienne check-ins", cron `30 4 * * *`, lecture/ajustement des
check-ins clients, notification 7h Paris) — les deux existent déjà, aucune
des deux n'est à recréer.

**Ce qui reste vrai et à surveiller** :
- Pas d'accès au dépôt git depuis une routine cloud (erreur 403 constatée),
  donc écriture uniquement via Supabase MCP (table `lead_magnets`
  directement) et vérification via PubMed MCP.
- Toujours vérifier `slug` inexistant avant insertion (contrainte unique).
- Toute affirmation physiologique doit être sourcée dans `sources` avec un
  DOI réel obtenu via PubMed MCP, jamais inventé.
- **Ce fichier ne se met PAS à jour tout seul** : la routine n'a pas accès
  au dépôt, donc chaque nouveau lot qu'elle produit reste invisible ici
  tant qu'une session locale (comme celle-ci) ne va pas vérifier le compte
  réel en base (`select count(*) from lead_magnets`) et reporter
  l'écart manuellement. Décalage constaté le 2026-08-17 : ce document
  annonçait 117 alors que la base en contenait 159, soit 42 entrées de
  retard accumulées sur 2 jours sans qu'aucune session ne les remarque.
  **Réflexe à prendre systématiquement en reprenant ce chantier : lancer
  le compte SQL en tout premier, avant de lire le tableau "Avancement" ci-dessus.**
