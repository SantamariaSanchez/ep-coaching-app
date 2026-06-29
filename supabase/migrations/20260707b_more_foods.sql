-- Base d'aliments — vague d'enrichissement (~150 aliments supplémentaires).
-- INSERT idempotent : ignore les lignes dont le nom existe déjà (pas de
-- contrainte unique sur foods.name, donc on vérifie explicitement).

INSERT INTO public.foods (name, category, calories_per_100, proteins_per_100, carbs_per_100, fats_per_100, fibers_per_100)
SELECT * FROM (VALUES

-- Viandes
('Steak haché 15%', 'Viandes', 215, 19, 0, 15, 0),
('Entrecôte boeuf', 'Viandes', 233, 20, 0, 17, 0),
('Filet de porc', 'Viandes', 143, 22, 0, 5.5, 0),
('Côte de porc', 'Viandes', 195, 21, 0, 12, 0),
('Gigot d''agneau', 'Viandes', 217, 25, 0, 13, 0),
('Foie de volaille', 'Viandes', 119, 17, 0.9, 4.8, 0),
('Cuisse de poulet (peau)', 'Viandes', 215, 18, 0, 16, 0),
('Bacon', 'Viandes', 541, 37, 1.4, 42, 0),
('Lardons', 'Viandes', 480, 14, 0.5, 47, 0),
('Saucisse de Toulouse', 'Viandes', 290, 16, 1, 25, 0),
('Chorizo', 'Viandes', 455, 24, 2, 38, 0),
('Bresaola', 'Viandes', 151, 32, 0.5, 2.5, 0),
('Boeuf séché', 'Viandes', 410, 33, 27, 11, 1.4),

-- Poissons / Fruits de mer
('Truite cuite', 'Poissons', 119, 21, 0, 4, 0),
('Maquereau', 'Poissons', 205, 19, 0, 14, 0),
('Merlu cuit', 'Poissons', 90, 18, 0, 1.3, 0),
('Lieu noir cuit', 'Poissons', 92, 19, 0, 1, 0),
('Dorade cuite', 'Poissons', 130, 21, 0, 4.5, 0),
('Anchois', 'Poissons', 131, 20, 0, 5, 0),
('Moules cuites', 'Poissons', 86, 12, 3.7, 2.2, 0),
('Calamars cuits', 'Poissons', 92, 16, 3.1, 1.4, 0),
('Huîtres', 'Poissons', 68, 9, 4.5, 2.5, 0),
('Surimi', 'Poissons', 99, 12, 10, 0.9, 0),
('Saumon fumé', 'Poissons', 142, 18, 0, 8, 0),

-- Oeufs
('Oeuf au plat (huile)', 'Oeufs', 196, 14, 0.6, 15, 0),
('Omelette nature', 'Oeufs', 154, 11, 0.8, 12, 0),

-- Féculents
('Riz basmati cuit', 'Feculents', 121, 2.5, 25, 0.4, 0.6),
('Riz cru (à peser cru)', 'Feculents', 360, 7, 79, 0.7, 1.4),
('Pâtes complètes cuites', 'Feculents', 124, 5.3, 25, 0.9, 3.5),
('Boulgour cuit', 'Feculents', 83, 3, 19, 0.2, 4.5),
('Semoule cuite', 'Feculents', 112, 3.8, 23, 0.2, 1.3),
('Sarrasin cuit', 'Feculents', 92, 3.4, 20, 0.6, 2.7),
('Pain blanc', 'Feculents', 265, 9, 49, 3.2, 2.7),
('Pain de mie', 'Feculents', 250, 8, 45, 3.5, 2.5),
('Biscotte', 'Feculents', 408, 10, 73, 7, 3.5),
('Polenta cuite', 'Feculents', 70, 1.7, 15, 0.3, 0.9),
('Pomme de terre vapeur', 'Feculents', 77, 1.7, 17, 0.1, 1.5),
('Frites au four', 'Feculents', 220, 3.4, 33, 8, 3),

-- Céréales / petit-déjeuner
('Muesli', 'Cereales', 360, 9, 65, 6, 7),
('Corn flakes', 'Cereales', 378, 7, 84, 0.9, 3),
('Granola', 'Cereales', 450, 9, 60, 18, 6),
('Pain au chocolat', 'Cereales', 410, 7, 44, 22, 2),
('Croissant', 'Cereales', 406, 8, 45, 21, 2),
('Baguette', 'Cereales', 274, 9, 55, 1.2, 2.7),

-- Laitiers
('Skyr nature', 'Laitiers', 63, 11, 4, 0.2, 0),
('Petit suisse', 'Laitiers', 100, 7.5, 4, 6, 0),
('Comté', 'Laitiers', 417, 28, 0, 33, 0),
('Emmental', 'Laitiers', 380, 28, 0, 30, 0),
('Parmesan', 'Laitiers', 392, 35, 4, 26, 0),
('Mascarpone', 'Laitiers', 450, 5, 4, 47, 0),
('Crème fraîche épaisse', 'Laitiers', 292, 2.5, 3, 30, 0),
('Lait écrémé', 'Laitiers', 35, 3.4, 5, 0.1, 0),
('Lait entier', 'Laitiers', 64, 3.2, 4.8, 3.6, 0),
('Babeurre', 'Laitiers', 40, 3.3, 4.8, 1, 0),
('Yaourt nature 0%', 'Laitiers', 43, 4.5, 6, 0.1, 0),
('Feta', 'Laitiers', 264, 14, 4, 21, 0),
('Chèvre frais', 'Laitiers', 290, 18, 2, 23, 0),

-- Oléagineux / graines
('Noix de cajou', 'Oleagineux', 553, 18, 30, 44, 3.3),
('Pistaches', 'Oleagineux', 562, 20, 28, 45, 10),
('Noisettes', 'Oleagineux', 628, 15, 17, 61, 9.7),
('Graines de chia', 'Oleagineux', 486, 17, 42, 31, 34),
('Graines de lin', 'Oleagineux', 534, 18, 29, 42, 27),
('Graines de courge', 'Oleagineux', 559, 30, 11, 49, 6),
('Graines de tournesol', 'Oleagineux', 584, 21, 20, 51, 8.6),
('Beurre d''amande', 'Oleagineux', 614, 21, 19, 56, 10),

-- Fruits
('Fraises', 'Fruits', 32, 0.7, 7.7, 0.3, 2),
('Kiwi', 'Fruits', 61, 1.1, 15, 0.5, 3),
('Mangue', 'Fruits', 60, 0.8, 15, 0.4, 1.6),
('Ananas', 'Fruits', 50, 0.5, 13, 0.1, 1.4),
('Raisin', 'Fruits', 69, 0.7, 18, 0.2, 0.9),
('Pêche', 'Fruits', 39, 0.9, 9.5, 0.3, 1.5),
('Poire', 'Fruits', 57, 0.4, 15, 0.1, 3.1),
('Pastèque', 'Fruits', 30, 0.6, 7.6, 0.2, 0.4),
('Melon', 'Fruits', 34, 0.8, 8, 0.2, 0.9),
('Citron', 'Fruits', 29, 1.1, 9, 0.3, 2.8),
('Framboises', 'Fruits', 52, 1.2, 12, 0.7, 6.5),
('Cerises', 'Fruits', 63, 1, 16, 0.2, 2.1),
('Figue fraîche', 'Fruits', 74, 0.8, 19, 0.3, 2.9),
('Datte séchée', 'Fruits', 282, 2.5, 75, 0.4, 8),
('Abricot', 'Fruits', 48, 1.4, 11, 0.4, 2),
('Pruneau séché', 'Fruits', 240, 2.2, 64, 0.4, 7.1),
('Fruits rouges mixtes surgelés', 'Fruits', 45, 1, 9, 0.3, 4),

-- Matières grasses
('Huile de coco', 'Matieres grasses', 862, 0, 0, 100, 0),
('Huile de colza', 'Matieres grasses', 884, 0, 0, 100, 0),
('Beurre', 'Matieres grasses', 717, 0.9, 0.1, 81, 0),
('Margarine', 'Matieres grasses', 717, 0.2, 1, 80, 0),
('Ghee', 'Matieres grasses', 900, 0, 0, 99.8, 0),

-- Légumes
('Courgette', 'Legumes', 17, 1.2, 3.1, 0.3, 1),
('Aubergine cuite', 'Legumes', 35, 0.8, 8.6, 0.2, 2.5),
('Poivron', 'Legumes', 31, 1, 6, 0.3, 2.1),
('Chou-fleur cuit', 'Legumes', 23, 1.8, 4.1, 0.3, 2),
('Champignons de Paris', 'Legumes', 22, 3.1, 3.3, 0.3, 1),
('Oignon', 'Legumes', 40, 1.1, 9.3, 0.1, 1.7),
('Ail', 'Legumes', 149, 6.4, 33, 0.5, 2.1),
('Salade verte', 'Legumes', 15, 1.4, 2.9, 0.2, 1.3),
('Concombre', 'Legumes', 15, 0.7, 3.6, 0.1, 0.5),
('Potiron cuit', 'Legumes', 26, 1, 6.5, 0.1, 0.5),
('Asperges cuites', 'Legumes', 22, 2.4, 3.9, 0.2, 2.1),
('Haricots verts cuits', 'Legumes', 31, 1.8, 7, 0.2, 3.4),
('Chou rouge', 'Legumes', 31, 1.4, 7.4, 0.2, 2.1),
('Poireau cuit', 'Legumes', 28, 1.3, 6.4, 0.2, 1.8),
('Betterave cuite', 'Legumes', 44, 1.7, 10, 0.2, 2),
('Céleri', 'Legumes', 16, 0.7, 3, 0.2, 1.6),
('Endives', 'Legumes', 17, 0.9, 4, 0.1, 3.1),

-- Légumineuses
('Haricots rouges cuits', 'Legumineuses', 127, 8.7, 23, 0.5, 6.4),
('Haricots blancs cuits', 'Legumineuses', 139, 9.7, 25, 0.5, 6.3),
('Edamame', 'Legumineuses', 121, 11, 9, 5, 5.2),
('Fèves cuites', 'Legumineuses', 88, 7.6, 14, 0.6, 5.4),
('Houmous', 'Legumineuses', 166, 8, 14, 9.6, 6),

-- Protéines végétales
('Tempeh', 'Proteines vege', 192, 20, 9, 11, 1.4),
('Seitan', 'Proteines vege', 370, 75, 14, 1.9, 0.6),
('Protéine de pois (poudre)', 'Proteines vege', 380, 80, 5, 3.5, 2),

-- Compléments
('Whey chocolat', 'Complements', 375, 76, 8, 6, 1),
('Whey isolate nature', 'Complements', 365, 88, 2, 1, 0),
('Caséine', 'Complements', 360, 78, 5, 1.5, 0),
('Barre protéinée', 'Complements', 350, 30, 35, 10, 5),
('BCAA poudre', 'Complements', 0, 0, 0, 0, 0),

-- Boissons
('Lait d''amande', 'Boissons', 24, 0.5, 2.5, 1.1, 0.3),
('Lait de soja', 'Boissons', 33, 3.3, 0.9, 1.8, 0.6),
('Lait d''avoine', 'Boissons', 47, 1, 6.5, 1.5, 0.8),
('Jus d''orange', 'Boissons', 45, 0.7, 10, 0.2, 0.2),
('Soda cola', 'Boissons', 42, 0, 10.6, 0, 0),
('Bière (5%)', 'Boissons', 43, 0.5, 3.6, 0, 0),
('Vin rouge', 'Boissons', 85, 0.1, 2.6, 0, 0),
('Café noir', 'Boissons', 1, 0.1, 0, 0, 0),
('Boisson énergisante', 'Boissons', 45, 0, 11, 0, 0),

-- Sucreries / snacks
('Miel', 'Sucreries', 304, 0.3, 82, 0, 0.2),
('Confiture', 'Sucreries', 278, 0.3, 69, 0.1, 0.9),
('Chocolat noir 70%', 'Sucreries', 598, 7.8, 46, 42, 11),
('Chocolat au lait', 'Sucreries', 535, 7.6, 59, 30, 3),
('Biscuits sablés', 'Sucreries', 480, 6, 65, 22, 1.7),
('Barre de céréales', 'Sucreries', 390, 5, 68, 11, 4),
('Glace vanille', 'Sucreries', 207, 3.5, 24, 11, 0.7),
('Chips', 'Sucreries', 536, 6.6, 53, 35, 4.4),
('Bonbons gélifiés', 'Sucreries', 343, 5, 77, 0.2, 0),

-- Sauces / condiments
('Moutarde', 'Sauces', 66, 4, 8, 3, 3.3),
('Ketchup', 'Sauces', 101, 1.2, 24, 0.2, 0.4),
('Mayonnaise', 'Sauces', 680, 1.1, 1.7, 75, 0),
('Vinaigre balsamique', 'Sauces', 88, 0.5, 17, 0, 0),
('Sauce soja', 'Sauces', 53, 8, 5, 0, 0.8),
('Sauce barbecue', 'Sauces', 140, 0.8, 33, 0.3, 0.5),
('Pesto', 'Sauces', 458, 4, 5, 46, 2),
('Sauce tomate', 'Sauces', 35, 1.5, 6, 0.5, 1.5),

-- Plats rapides / restaurant
('Pizza margherita', 'Fast food', 266, 11, 33, 10, 2.3),
('Burger classique', 'Fast food', 295, 17, 24, 14, 1.5),
('Frites fast food', 'Fast food', 312, 3.4, 41, 15, 3.8),
('Sushi saumon', 'Fast food', 150, 6, 24, 3, 0.5),
('Kebab', 'Fast food', 250, 14, 22, 12, 1.8),
('Nuggets de poulet', 'Fast food', 296, 15, 17, 18, 1.2)

) AS t(name, category, calories_per_100, proteins_per_100, carbs_per_100, fats_per_100, fibers_per_100)
WHERE NOT EXISTS (SELECT 1 FROM public.foods f WHERE f.name = t.name);
