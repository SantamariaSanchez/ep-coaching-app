<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Déploiement

Cette app est déployée sur Vercel, branché sur `origin/master` (auto-deploy à chaque push).
Après **toute** modification de code dans ce repo (fix, feature, refactor), il faut systématiquement :
1. `git add` des fichiers modifiés (jamais `-A` à l'aveugle, lister les fichiers concernés).
2. Créer un commit avec un message clair en français.
3. `git push origin master`.

Ne jamais laisser des changements uniquement en local — l'utilisateur teste sur le site déployé
(`ep-coaching.vercel.app`), pas en local. Si une migration SQL est ajoutée dans `supabase/migrations/`,
le dire explicitement à l'utilisateur car elle doit être exécutée manuellement dans le Supabase SQL Editor
(ce n'est pas automatisé par le déploiement Vercel).
