# Appli native iOS / Android (Capacitor)

L'appli des stores charge le site en ligne (https://ep-coaching.vercel.app/launch) : chaque push
sur master met aussi à jour l'appli installée, sans republier. La coquille native ajoute : push
natif, retour haptique, barre d'état, écran de démarrage, bouton retour Android, liens profonds,
liens externes dans le navigateur intégré (components/native/NativeBridge.tsx).

- Config : capacitor.config.ts (appId com.epcoaching.app)
- Projets générés : android/ et ios/ (ne pas modifier à la main sauf réglages natifs)
- Page de secours hors connexion : native/www/offline.html

## Après une modification des plugins ou de la config

    npx cap sync

## Notifications push natives (Firebase Cloud Messaging)

1. Créer un projet Firebase, ajouter une appli Android (com.epcoaching.app) et une appli iOS.
2. Android : déposer google-services.json dans android/app/.
3. iOS : dans Firebase, déposer la clé APNs (.p8) créée dans le compte Apple Developer.
4. Vercel : FIREBASE_SERVICE_ACCOUNT (JSON du compte de service, Sensitive) et
   NEXT_PUBLIC_NATIVE_PUSH=1. Envoi côté serveur : lib/native-push.ts (appelé par lib/push.ts).

## Publier

- Android : ouvrir android/ dans Android Studio, Build > Generate Signed Bundle (.aab), Play Console.
- iOS : sur un Mac (ou un service de compilation en ligne), ouvrir ios/App dans Xcode, signer avec
  le compte Apple Developer, Product > Archive, envoi vers App Store Connect.
- Icônes et écran de démarrage : `npx @capacitor/assets generate` à partir d'une icône 1024 px.

## Revue Apple (règle 4.2, fonctionnalités minimales)

Les points natifs qui comptent : push natif, haptique, caméra (prompteur, photos), partage natif,
aucune page qui ressemble à un site (pas de bandeau « installer l'appli », pas de sélection de
texte sur l'interface). Prévoir un compte de démonstration coach + client pour les testeurs Apple.
