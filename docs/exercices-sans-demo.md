# Démonstrations des exercices de la bibliothèque

État au 2026-10-25 : 736 exercices de la bibliothèque (is_official) sur 736 n'ont ni vidéo ni photo.

| Muscle | Sans démo |
|---|---|
| Dos | 136 |
| Pectoraux | 84 |
| Épaules | 82 |
| Quadriceps | 77 |
| Full Body / Cardio | 66 |
| Fessiers | 56 |
| Abdominaux | 51 |
| Triceps | 36 |
| Biceps | 35 |
| Ischio-jambiers | 33 |
| Mollets | 33 |
| Avant-bras | 19 |
| Trapèzes | 14 |
| Adducteurs | 14 |

## Comment remplir

Colonnes concernées : `exercise_library.video_url` (lien YouTube / Vimeo / fichier) et `exercise_library.image_url` (photo).
Elles s'affichent automatiquement au client (séance guidée, page Programme, fiche exo) dès qu'elles sont renseignées.

1. `npm run demos:liste` génère la liste complète à cocher (`docs/exercices-sans-demo.md` est alors réécrit) :
   priorité aux exos réellement prescrits, puis tout par muscle.
2. Remplir un CSV `nom;video_url;image_url` (une ligne par exo, colonne vide = ignorée).
3. `npm run demos:appliquer -- demos.csv` met la bibliothèque à jour (rafraîchie dans l'heure).

Dans l'app, côté coach (Bibliothèque), le filtre « Sans démo » et le badge sur chaque fiche donnent la même vue en direct,
et le coach peut aussi coller un lien ou envoyer une photo directement depuis la fiche d'un exercice.
