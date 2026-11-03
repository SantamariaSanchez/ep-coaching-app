import test from "node:test";
import assert from "node:assert/strict";
import { parseCount, parseSeconds, parsePercent, parseScreenshotText } from "../social/screenshot-parse";

test("nombres abrégés et séparateurs", () => {
  assert.equal(parseCount("1 234"), 1234);
  assert.equal(parseCount("1.234"), 1234);
  assert.equal(parseCount("1,2 k"), 1200);
  assert.equal(parseCount("12.5K"), 12500);
  assert.equal(parseCount("3 M"), 3_000_000);
  assert.equal(parseCount("87"), 87);
  assert.equal(parseCount("abc"), null);
});

test("durées et pourcentages", () => {
  assert.equal(parseSeconds("0:45"), 45);
  assert.equal(parseSeconds("1:05"), 65);
  assert.equal(parseSeconds("12,4 s"), 12.4);
  assert.equal(parseSeconds("1 min 5 s"), 65);
  assert.equal(parsePercent("12,3 %"), 12.3);
  assert.equal(parsePercent("150 %"), null);
});

test("capture Instagram (chiffre sur la même ligne)", () => {
  const ocr = `Statistiques du reel
Vues 12,5 k
Comptes touchés 9 870
Mentions J'aime 640
Commentaires 38
Partages 210
Enregistrements 455
Abonnements 27
Temps de visionnage moyen 6 s`;
  assert.deepEqual(parseScreenshotText(ocr), {
    views: 12500,
    reach: 9870,
    likes: 640,
    comments: 38,
    shares: 210,
    saves: 455,
    newFollowers: 27,
    avgWatchSeconds: 6,
  });
});

test("capture TikTok en anglais (chiffre au-dessus du libellé)", () => {
  const ocr = `Overview
Last 7 days
45.2K
Video views
3,1K
Likes
112
Comments
88
Shares
1:03
Total play time
0:09
Average watch time
24.5%
Watched full video
61
New followers`;
  const v = parseScreenshotText(ocr);
  assert.equal(v.views, 45200);
  assert.equal(v.likes, 3100);
  assert.equal(v.comments, 112);
  assert.equal(v.shares, 88);
  assert.equal(v.avgWatchSeconds, 9);
  assert.equal(v.completionRate, 24.5);
  assert.equal(v.newFollowers, 61);
});

test("« 30 derniers jours » n'est jamais lu comme un chiffre", () => {
  assert.deepEqual(parseScreenshotText("Vues (30 derniers jours)\n2 400"), { views: 2400 });
});

test("texte sans libellé connu : rien n'est inventé", () => {
  assert.deepEqual(parseScreenshotText("Bonjour 123\nHello 456"), {});
});

test("capture Instagram (chiffre en dessous du libellé)", () => {
  const ocr = `Aperçu
Vues
8 200
Comptes touchés
6 100
Partages
95
Enregistrements
140`;
  assert.deepEqual(parseScreenshotText(ocr), { views: 8200, reach: 6100, shares: 95, saves: 140 });
});

test("capture en grille (deux colonnes par ligne, texte réel lu par Tesseract)", () => {
  const ocr = "Last 7 days\n\n45.2K 3.1K\n\nVideo views Likes\n\n112 88\n\nComments Shares\n\n9.4s 24.5%\nAverage watch time Watched full video\n";
  assert.deepEqual(parseScreenshotText(ocr), { views: 45200, likes: 3100, comments: 112, shares: 88, avgWatchSeconds: 9.4, completionRate: 24.5 });
});
