-- Axe FG (MASTERCLASS.md) — retour direct 2026-09-22 : "on peut réellement
-- tout faire sur la prog ou la nutrition d'un client ?". La table `foods`
-- (808 lignes) n'avait aucune colonne diététique : la seule catégorisation
-- est `category` (texte libre, incohérent : accents/pluriel différents
-- selon le batch de seed, ex. "Legumes" vs "Légume"), et lib/meal-creator.ts
-- ne fait qu'une approximation par catégorie ("Compatibilité régime/
-- allergène au niveau de la catégorie... pas de tag par aliment"), déjà
-- explicitement documentée comme un compromis dans le code.
--
-- Ajoute deux colonnes texte[] réutilisant EXACTEMENT les énumérations déjà
-- utilisées ailleurs dans l'appli (lib/recipes-data.ts Diet/Allergen), pour
-- que ce ne soit pas une troisième taxonomie incompatible :
--   diet_tags  : sous-ensemble de omnivore/vegetarien/vegan/pescetarien
--                avec lesquels CET aliment est compatible.
--   allergens  : sous-ensemble des 8 allergènes déjà listés dans
--                lib/recipes-data.ts, présents dans CET aliment.
-- NULL = pas encore vérifié. Jamais déduit par défaut ("pas de tag" ne veut
-- jamais dire "sans risque") — voir lib/food-watch-keywords.ts qui doit
-- continuer à fonctionner en heuristique de secours sur les lignes NULL.
--
-- Backfill : les 808 lignes ont été passées en revue nom par nom (voir
-- MASTERCLASS.md Axe FG pour le raisonnement détaillé par catégorie).
-- Principe suivi partout : un aliment composite ou dont la recette varie
-- réellement d'un fabricant/foyer à l'autre (Sucreries ambiguës type
-- "Granola"/"Muesli", "Sauce curry", "Réglisse", "Gnocchi"...) reste NULL
-- plutôt que deviné — le risque de mal étiqueter un aliment (signalé dès
-- l'Axe FE) est pris au sérieux, pas juste réduit.

alter table public.foods add column if not exists diet_tags text[];
alter table public.foods add column if not exists allergens text[];

comment on column public.foods.diet_tags is
  'Sous-ensemble de omnivore/vegetarien/vegan/pescetarien (même énumération que lib/recipes-data.ts Diet) avec lesquels cet aliment est compatible. NULL = pas encore vérifié, ne jamais déduire par défaut.';
comment on column public.foods.allergens is
  'Sous-ensemble des 8 allergènes de lib/recipes-data.ts Allergen présents dans cet aliment. NULL = pas encore vérifié.';

-- Même pattern que 20260805k_input_hardening_constraints.sql : NOT VALID
-- pour ne pas bloquer sur les lignes existantes, mais valider tout nouvel
-- écrit à partir de maintenant.
alter table public.foods add constraint foods_diet_tags_valid_chk
  check (diet_tags is null or diet_tags <@ array['omnivore','vegetarien','vegan','pescetarien']::text[]) not valid;
alter table public.foods add constraint foods_allergens_valid_chk
  check (allergens is null or allergens <@ array['gluten','lactose','oeuf','fruits-a-coque','poisson','crustaces','soja','arachide']::text[]) not valid;

-- ── Bug de données trouvé pendant l'audit : "Whey" catégorisé "Viandes" ──
-- La whey est une protéine laitière, pas de la viande. Recatégorisé avant
-- le reste (sinon il aurait été inclus dans le bloc "Viandes = omnivore").
update public.foods set category = 'Complements' where name = 'Whey' and category = 'Viandes';

-- ══════════════════════════════════════════════════════════════════════
-- VIANDES / VOLAILLE / CHARCUTERIE — omnivore uniquement, pas d'allergène
-- des 8 listés de façon fiable à partir du seul nom.
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore']
where category in ('Viandes','Viande rouge','Viande blanche','Charcuterie');

-- ══════════════════════════════════════════════════════════════════════
-- POISSONS & FRUITS DE MER
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','pescetarien'], allergens = array['poisson']
where category in ('Poissons','Poisson')
  and name = any (array[
    'Anchois','Anchois à l''huile','Anguille fumée','Bar (loup de mer) cuit','Cabillaud cuit',
    'Daurade royale cuite','Dorade cuite','Espadon cuit','Flétan cuit','Hareng fumé',
    'Lieu jaune cuit','Lieu noir cuit','Limande cuite','Maquereau au vin blanc (boîte)',
    'Merlan cuit','Merlu cuit','Rouget cuit','Sardines à l''huile d''olive (boîte)','Sardines boite',
    'Saumon cuit','Sole cuite','Thon au naturel (boîte)','Thon boite egoutte','Thon rouge cru',
    'Truite arc-en-ciel cuite','Truite cuite','Turbot cuit','Surimi','Surimi bâtonnet','Tarama',
    'Cabillaud','Maquereau','Sardines (conserve)','Saumon (frais)','Saumon fumé','Soles / Limande',
    'Thon (en conserve, eau)','Thon (en conserve, huile)','Truite'
  ]);

update public.foods set diet_tags = array['omnivore','pescetarien'], allergens = array['crustaces']
where category in ('Poissons','Poisson')
  and name = any (array['Crabe cuit','Crevettes cuites','Gambas grillées','Homard cuit','Langouste cuite','Langoustines cuites','Crevettes']);

update public.foods set diet_tags = array['omnivore','pescetarien']
where category = 'Poissons'
  and name = any (array['Calamars cuits','Huîtres','Moules cuites','Oursin','Palourdes cuites','Poulpe cuit','Saint-Jacques','Seiche cuite']);

-- Escargot de Bourgogne : mollusque terrestre, pas un produit de la mer —
-- traité à part, pas rattaché au pescétarisme.
update public.foods set diet_tags = array['omnivore']
where category = 'Poissons' and name = 'Escargots de Bourgogne';

-- ══════════════════════════════════════════════════════════════════════
-- LÉGUMES, FRUITS — végétal pur, compatible avec les 4 régimes
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category in ('Legumes','Légume','Fruits','Fruit','Fruit séché');

-- Exceptions allergènes à l'intérieur de "Legumes" (soja) :
update public.foods set allergens = array['soja']
where category = 'Legumes' and name = 'Pousses de soja';

-- ══════════════════════════════════════════════════════════════════════
-- LÉGUMINEUSES
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category in ('Legumineuses','Légumineuse');

update public.foods set allergens = array['soja']
where category in ('Legumineuses','Légumineuse')
  and name = any (array['Edamame (soja jeune)','Soja en grain cuit','Edamame','Tofu ferme']);

-- ══════════════════════════════════════════════════════════════════════
-- OLÉAGINEUX — végétal, allergènes fruits à coque / arachide séparés
-- (l'arachide est une légumineuse, pas un fruit à coque : allergène distinct)
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category in ('Oleagineux','Oléagineux');

update public.foods set allergens = array['fruits-a-coque']
where category in ('Oleagineux','Oléagineux')
  and name = any (array[
    'Noix de macadamia','Noix de pécan','Noix de pin (pignons)','Pistaches (sans coque)',
    'Purée de cajou','Purée de noisette','Beurre d''amande',
    'Amandes','Noisettes','Noix','Noix de cajou','Noix du Brésil','Pistaches'
  ]);

update public.foods set allergens = array['arachide']
where category in ('Oleagineux','Oléagineux')
  and name = any (array['Arachides (cacahuètes crues)','Beurre cacahuete','Cacahuètes grillées salées','Beurre de cacahuète']);

-- ══════════════════════════════════════════════════════════════════════
-- PROTÉINES VÉGÉTALES — végan par construction (nom explicite "végétal")
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Proteines vege';

update public.foods set allergens = array['gluten']
where category = 'Proteines vege' and name = 'Seitan';

update public.foods set allergens = array['soja']
where category = 'Proteines vege'
  and name = any (array['Protéine de soja texturée (PVT)','Tempeh','Tofu fumé','Tofu soyeux','Yaourt soja nature']);

-- ══════════════════════════════════════════════════════════════════════
-- ÉPICES & DIVERS (non sucrés) — végétal pur
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Epices';

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Divers'
  and name = any (array['Café (noir, sans sucre)','Chocolat noir 70%','Chocolat noir 85%','Levure nutritionnelle','Thé (sans sucre)']);

-- ══════════════════════════════════════════════════════════════════════
-- LAITIERS & ŒUFS — pas vegan, vegetarien-compatibles
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose']
where category in ('Laitiers','Laitier');

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['oeuf']
where category in ('Oeufs','Œufs');

update public.foods set allergens = array['oeuf','lactose']
where category = 'Oeufs' and name = 'Oeufs brouillés (beurre)';

-- ══════════════════════════════════════════════════════════════════════
-- BOISSONS
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Boissons'
  and name = any (array[
    'Champagne','Cidre doux','Eau de coco','Eau gazeuse','Gin',
    'Jus d''ananas','Jus d''orange','Jus d''orange frais','Jus de citron pur','Jus de mangue',
    'Jus de pamplemousse','Jus de pomme','Jus de raisin','Jus de tomate','Kombucha','Limonade',
    'Pastis','Porto','Rhum','Sirop de grenadine','Soda cola','Soda cola zéro','Soda orange (Fanta)',
    'Tequila','Thé glacé sucré','Thé noir','Thé vert','Tisane / infusion','Vin blanc','Vin rosé',
    'Vin rouge','Vodka','Whisky','Café expresso','Café noir','Café noir filtre',
    'Boisson de récupération sportive','Boisson électrolytes (ex. Gatorade)','Boisson énergisante',
    'Lait de coco (boisson)'
  ]);

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien'], allergens = array['gluten']
where category = 'Boissons' and name = any (array['Bière (5%)','Bière blonde (5°)','Bière sans alcool']);

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien'], allergens = array['fruits-a-coque']
where category = 'Boissons' and name = any (array['Lait d''amande','Lait d''amande non sucré']);

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Boissons' and name = 'Lait d''avoine';

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien'], allergens = array['soja']
where category = 'Boissons' and name = any (array['Lait de soja','Lait de soja non sucré']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose']
where category = 'Boissons'
  and name = any (array['Café avec lait','Cappuccino','Chocolat chaud','Lait chocolaté','Boisson protéinée prête (Fairlife)','Liqueur de café (type Baileys)']);

-- ══════════════════════════════════════════════════════════════════════
-- MATIÈRES GRASSES
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category in ('Matieres grasses','Matière grasse')
  and name = any (array[
    'Huile d''olive','Huile de coco','Crème de coco','Huile d''olive vierge extra','Huile de coco vierge',
    'Huile de colza','Huile de lin','Huile de palme','Huile de sésame','Huile de tournesol',
    'Huile olive','Margarine végétale'
  ]);

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien'], allergens = array['arachide']
where category = 'Matieres grasses' and name = 'Huile d''arachide';

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien'], allergens = array['fruits-a-coque']
where category = 'Matieres grasses' and name = 'Huile de noix';

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose']
where category in ('Matieres grasses','Matière grasse')
  and name = any (array['Beurre','Beurre doux','Beurre salé','Ghee (beurre clarifié)','Ghee','Crème liquide entière 30%','Crème liquide légère 12%']);

update public.foods set diet_tags = array['omnivore']
where category in ('Matieres grasses','Matière grasse') and name = any (array['Graisse de canard','Saindoux']);

-- ══════════════════════════════════════════════════════════════════════
-- SAUCES
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category in ('Sauce','Sauces')
  and name = any (array[
    'Houmous','Ketchup','Moutarde','Sauce barbecue','Sauce tomate (nature)','Vinaigrette (huile/vinaigre)',
    'Bouillon de légumes (cube)','Chutney de mangue','Concentré de tomate','Cornichons / pickles',
    'Coulis de tomate','Crème de vinaigre balsamique','Guacamole','Harissa','Houmous maison',
    'Moutarde de Dijon','Purée de tomates','Sauce aigre-douce','Sauce sriracha','Sauce Tabasco',
    'Sauce tomate','Vinaigre balsamique','Vinaigre blanc','Vinaigre de cidre','Vinaigrette classique'
  ]);

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien'], allergens = array['soja','gluten']
where category in ('Sauce','Sauces') and name = any (array['Sauce soja (légère)','Sauce soja','Sauce hoisin','Sauce teriyaki']);

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien'], allergens = array['soja']
where category = 'Sauces' and name = 'Sauce soja (tamari)';

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['oeuf']
where category = 'Sauces' and name = any (array['Mayonnaise','Mayonnaise (classique)','Mayonnaise allégée','Sauce aïoli']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['oeuf']
where category = 'Sauce' and name = 'Mayonnaise (standard)';

update public.foods set diet_tags = array['omnivore','pescetarien'], allergens = array['poisson']
where category = 'Sauces' and name = any (array['Nuoc-mâm','Sauce Worcestershire']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose','fruits-a-coque']
where category = 'Sauces' and name = any (array['Pesto','Pesto rosso']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose']
where category = 'Sauces' and name = any (array['Sauce au poivre','Sauce ranch','Sauce tzatziki']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose','gluten']
where category = 'Sauces' and name = 'Sauce béchamel';

update public.foods set diet_tags = array['omnivore','pescetarien'], allergens = array['oeuf','lactose','poisson']
where category = 'Sauces' and name = 'Sauce caesar';

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['oeuf','lactose']
where category = 'Sauces' and name = 'Sauce hollandaise';

update public.foods set diet_tags = array['omnivore']
where category = 'Sauces' and name = 'Bouillon de volaille (cube)';

-- ══════════════════════════════════════════════════════════════════════
-- CÉRÉALES / FÉCULENTS — végan par défaut (farine/eau/sel = pas de produit
-- animal), le gluten est un axe séparé du statut végan.
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Cereales' and name = any (array['Corn flakes','Flocons avoine','Quinoa cuit']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['gluten','lactose']
where category = 'Cereales' and name = any (array['Croissant','Pain au chocolat']);

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category in ('Feculents','Féculent','Féculents')
  and name = any (array[
    'Amarante cuite','Châtaignes cuites','Crème de riz','Farine d''avoine','Farine de riz','Farine de sarrasin',
    'Flocons d''avoine','Frites au four','Galette de riz soufflé','Maïzena (fécule de maïs)','Millet cuit',
    'Pain sans gluten','Polenta cuite','Pomme de terre au four','Pomme de terre cuite',
    'Pomme de terre cuite à l''eau','Pomme de terre vapeur','Riz basmati cuit','Riz blanc cuit',
    'Riz complet cuit','Riz cru (à peser cru)','Riz noir (riz interdit) cuit','Riz sauvage cuit',
    'Sarrasin cuit','Tapioca cuit (perles)','Teff cuit','Vermicelles de riz cuits',
    'Avoine (flocons secs)','Patate douce (cuite)','Pomme de terre (vapeur)','Quinoa (cuit)',
    'Riz basmati (cuit)','Riz blanc (cuit)','Riz complet (cuit)','Patate douce cuite'
  ]);

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien'], allergens = array['gluten']
where category in ('Feculents','Féculent','Féculents')
  and name = any (array[
    'Bagel nature','Baguette tradition','Biscotte','Boulgour cuit','Crackers type Wasa','Épeautre cuit',
    'Farine complète','Farine de blé','Kamut cuit','Nouilles soba cuites','Nouilles udon cuites',
    'Orge perlé cuit','Pain aux céréales','Pain blanc','Pain de campagne','Pain de mie',
    'Pain de mie complet','Pain pita','Pâte à pizza crue','Pâtes blé complet cuites',
    'Pâtes complètes cuites','Pates cuites','Penne cuites','Semoule cuite','Semoule de couscous cuite',
    'Spaghetti cuits','Taboulé','Vermicelles de riz cuits','Wrap / Tortilla de blé',
    'Lasagnes (pâtes) cuites','Bagel','Pain complet','Pain de seigle','Pâtes blanches (cuites)',
    'Pâtes complètes (cuites)','Semoule (cuite)','Tortilla de blé'
  ]);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['gluten','lactose']
where category in ('Feculents','Féculent') and name = any (array['Pâte feuilletée crue','Pâte brisée crue','Naan']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose']
where category = 'Feculents' and name = 'Purée de pomme de terre (maison)';

-- ══════════════════════════════════════════════════════════════════════
-- SUCRANT
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Sucrant' and name = any (array['Confiture (standard)','Sirop d''agave','Sucre blanc','Sucre de coco']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien']
where category = 'Sucrant' and name = 'Miel';

-- ══════════════════════════════════════════════════════════════════════
-- SUCRERIES — pâtisseries (beurre/œuf/lait quasi systématiques), le reste
-- au cas par cas ; les recettes trop variables (Granola, Muesli, Réglisse,
-- barre de céréales générique...) restent volontairement NULL.
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Sucreries'
  and name = any (array[
    'Cacao en poudre non sucré','Compote de pomme sans sucre','Érythritol','Stevia (poudre)','Xylitol',
    'Sucre roux','Sirop d''érable','Sirop de glucose','Chips','Chips (nature)',
    'Flocon de maïs soufflé (pop-corn sans beurre)','Sorbet citron','Sorbet fruits rouges',
    'Confiture','Confiture d''abricot','Confiture de fraise'
  ]);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose']
where category = 'Sucreries' and name = any (array['Chocolat au lait','Chocolat au lait 45%','Chocolat blanc','Glace vanille','Panna cotta','Riz au lait','Yaourt glacé']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['oeuf']
where category = 'Sucreries' and name = 'Nougat';

update public.foods set diet_tags = array['omnivore']
where category = 'Sucreries' and name = any (array['Bonbons gélifiés','Marshmallow']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose','gluten']
where category = 'Sucreries' and name = any (array['Biscuits sablés','Barres de céréales type Kinder','Spéculoos','Tarte aux pommes','Pâte à tartiner spéculoos']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['gluten','lactose','oeuf']
where category = 'Sucreries'
  and name = any (array['Brioche','Brownie','Cookie','Donut sucré','Éclair au chocolat','Fondant au chocolat','Gaufre','Madeleine','Pancake nature','Crêpe nature','Tiramisu']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose']
where category = 'Sucreries' and name = any (array['Caramel au beurre salé','Crème brûlée']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['oeuf','lactose']
where category = 'Sucreries' and name = 'Crème brûlée';

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['oeuf','lactose','fruits-a-coque']
where category = 'Sucreries' and name = 'Macaron';

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose','fruits-a-coque']
where category = 'Sucreries' and name = 'Pâte à tartiner chocolat-noisette';

-- ══════════════════════════════════════════════════════════════════════
-- FAST FOOD — plats composites, tag uniquement quand le nom rend le
-- contenu non ambigu.
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Fast food' and name = 'Frites fast food';

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['gluten','lactose']
where category = 'Fast food' and name = any (array['Burger végétarien (fast food)','Pizza margherita']);

update public.foods set diet_tags = array['omnivore','pescetarien'], allergens = array['poisson','oeuf']
where category = 'Fast food' and name = 'Salade niçoise';

update public.foods set diet_tags = array['omnivore','pescetarien'], allergens = array['poisson']
where category = 'Fast food' and name = any (array['Poke bowl saumon','Sushi saumon']);

update public.foods set diet_tags = array['omnivore','pescetarien'], allergens = array['poisson','gluten']
where category = 'Fast food' and name = 'Fish and chips';

update public.foods set diet_tags = array['omnivore','pescetarien'], allergens = array['poisson','soja','gluten']
where category = 'Fast food' and name = 'Saumon teriyaki (plat)';

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['oeuf']
where category = 'Fast food' and name = 'Œufs mayonnaise';

update public.foods set diet_tags = array['omnivore'], allergens = array['oeuf','lactose','gluten']
where category = 'Fast food' and name = 'Quiche lorraine';

update public.foods set diet_tags = array['omnivore'], allergens = array['gluten']
where category = 'Fast food'
  and name = any (array['Ramen (soupe)','Nems frits','Nuggets de poulet','Lasagnes bolognaise','Sandwich jambon-beurre','Tacos viande','Wraps poulet grillé','Gyoza (ravioli japonais frits)']);

update public.foods set diet_tags = array['omnivore'], allergens = array['oeuf','crustaces']
where category = 'Fast food' and name = 'Riz cantonais';

update public.foods set diet_tags = array['omnivore'], allergens = array['lactose']
where category = 'Fast food' and name = any (array['Moussaka','Croque-monsieur']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose']
where category = 'Fast food' and name = 'Gratin dauphinois';

update public.foods set diet_tags = array['omnivore','pescetarien'], allergens = array['crustaces','oeuf','arachide','gluten']
where category = 'Fast food' and name = 'Pad thaï';

update public.foods set diet_tags = array['omnivore','pescetarien'], allergens = array['crustaces','poisson']
where category = 'Fast food' and name = 'Paella';

update public.foods set diet_tags = array['omnivore'], allergens = array['gluten','lactose']
where category = 'Fast food' and name = any (array['Croque-monsieur','Galette bretonne (sarrasin) garnie']);

update public.foods set diet_tags = array['omnivore']
where category = 'Fast food'
  and name = any (array[
    'Boeuf bourguignon','Boulettes de boeuf en sauce','Burger classique','Burrito complet','Cassoulet',
    'Chili con carne','Cordon bleu','Couscous royal (plat complet)','Curry de poulet (plat)',
    'Dim sum porc (vapeur)','Hachis parmentier','Hot dog','Kebab','Poulet basquaise','Poulet tandoori',
    'Sauce bolognaise'
  ]);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['oeuf','lactose','gluten']
where category = 'Fast food' and name = any (array['Clafoutis cerises','Crêpe Suzette (avec sauce)']);

-- ══════════════════════════════════════════════════════════════════════
-- COMPLÉMENTS / SNACK / PROTÉINE POUDRE
-- ══════════════════════════════════════════════════════════════════════
update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Complements'
  and name = any (array['BCAA (poudre)','BCAA poudre','Créatine monohydrate','Dextrose','Glutamine','L-Carnitine (poudre)','Maltodextrine','Levure de bière','Spiruline (poudre)','Boisson pré-workout']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose']
where category = 'Complements'
  and name = any (array['Caséine','Caséine (poudre)','Whey chocolat','Whey isolat','Whey isolate nature','Whey vanille','Gainer (mass gainer)','Barre protéinée','Barre protéinée (type Quest)','Shake maison (whey + banane + lait)']);

update public.foods set diet_tags = array['omnivore']
where category = 'Complements' and name = 'Collagène (poudre)';

update public.foods set diet_tags = array['omnivore','pescetarien'], allergens = array['poisson']
where category = 'Complements' and name = 'Oméga-3 (huile de poisson)';

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Complements' and name = 'ZMA (zinc-magnésium)';

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Snack' and name = any (array['Chips de légumes','Galette de riz (nature)','Popcorn (nature)']);

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien'], allergens = array['fruits-a-coque']
where category = 'Snack' and name = 'Mélange noix/fruits secs';

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose']
where category = 'Snack' and name = 'Barre protéinée (standard)';

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Protéine poudre' and name = any (array['EAA (poudre)','Protéine végétale (pois/riz)']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose']
where category = 'Protéine poudre' and name = any (array['Caséine micellaire','Whey isolate','Whey protéine (nature)']);
