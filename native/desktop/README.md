# EP Coaching pour Windows et Mac

Choix : **Electron**, le plus simple et le plus fiable ici (JavaScript pur, pas de
Rust à installer, mêmes versions de Chrome que le site). Tauri est plus léger mais
demande Rust et des compilateurs par système ; à reconsidérer plus tard si le
poids de l'installeur compte. L'appli ouvre simplement https://ep-coaching.vercel.app,
donc elle est toujours à jour sans republier.

Aucun binaire n'est livré, ni signature, ni compte développeur à ce stade.

## Essayer en local

```
cd native/desktop
npm install
npm start
```

## Fabriquer les installeurs (plus tard)

- Windows : `npm run build:win` sur Windows (installeur .exe). Sans signature,
  Windows affiche un avertissement SmartScreen au premier lancement.
- Mac : `npm run build:mac` sur un Mac (.dmg). Sans compte Apple Developer
  (99 $/an) et sans signature + notarisation, Mac bloque l'ouverture : clic droit
  puis Ouvrir. Pour la distribution publique, il faudra ce compte.

## Connexion Google et Apple

Google refuse les fenêtres intégrées : leurs pages s'ouvrent dans le navigateur,
puis le lien `epcoaching://app/auth/oauth/native` ramène dans l'appli (même
mécanisme que sur téléphone). Procédure côté Supabase : page Notion
« Activer Google et Apple Sign-In ».

## En attendant

Sans rien installer, le site s'installe déjà comme appli depuis Chrome ou Edge
(icône d'installation dans la barre d'adresse) : fenêtre dédiée, icône, notifications.
