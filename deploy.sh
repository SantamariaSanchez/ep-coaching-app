#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  EP Coaching — Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Build check
echo ""
echo "▶ Build..."
npm run build
if [ $? -ne 0 ]; then
  echo "✗ Erreur build — deploy annulé"
  exit 1
fi
echo "✓ Build OK"

# Git
echo ""
echo "▶ Git push..."
git add -A
git diff --cached --quiet && echo "  (rien à committer)" || git commit -m "Update $(date '+%Y-%m-%d %H:%M')"
git push origin master
echo "✓ Push OK"

# Vercel
echo ""
echo "▶ Vercel deploy..."
npx vercel --prod --yes
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Deploy terminé"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
