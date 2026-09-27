// Génère les contrats de collaboration en PDF, un par poste, dans
// contracts-templates/{roleKey}.pdf (dossier ignoré par git).
// Seule source de vérité : lib/org-roles.ts (postes) et lib/staff-contract.ts
// (texte du contrat, version). Usage : npm run contracts:generate [roleKey...]
// Puis `npm run contracts:upload` pour les envoyer dans Supabase Storage.
import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import { POLES } from "../lib/org-roles";
import { COMPANY, STAFF_CONTRACT_VERSION, buildStaffContract } from "../lib/staff-contract";

const OUT = process.env.CONTRACTS_OUT ?? join(process.cwd(), "contracts-templates");
const FONTS = join(process.cwd(), "node_modules/@expo-google-fonts/inter");
const LOGO = join(process.cwd(), "public/logo-email.jpg");

const C = {
  red: "#E01E1E",
  dark: "#0D0000",
  darkRed: "#3A0606",
  text: "#1F1F1F",
  muted: "#6B6B6B",
  light: "#9A9A9A",
  panel: "#FBF3F3",
  line: "#E7DADA",
  goldBg: "#FFF6E6",
  gold: "#E5A23A",
};

const PAGE = { w: 595.28, h: 841.89 };
const M = { left: 60, right: 60, top: 70, bottom: 78 };
const W = PAGE.w - M.left - M.right;

type Doc = PDFKit.PDFDocument;

function fonts(doc: Doc) {
  doc.registerFont("R", join(FONTS, "400Regular/Inter_400Regular.ttf"));
  doc.registerFont("SB", join(FONTS, "600SemiBold/Inter_600SemiBold.ttf"));
  doc.registerFont("B", join(FONTS, "700Bold/Inter_700Bold.ttf"));
  doc.registerFont("XB", join(FONTS, "800ExtraBold/Inter_800ExtraBold.ttf"));
}

function ensureSpace(doc: Doc, needed: number) {
  if (doc.y + needed > PAGE.h - M.bottom) doc.addPage();
}

function firstPageHeader(doc: Doc, poleName: string, roleTitle: string, roleKey: string) {
  const H = 250;
  doc.save();
  doc.rect(0, 0, PAGE.w, H).fill(C.dark);
  // Halo rouge sombre en haut à droite (identité "rouge brume"), limité au bandeau.
  doc.rect(0, 0, PAGE.w, H).clip();
  doc.circle(PAGE.w - 40, 60, 210).fillOpacity(0.85).fill(C.darkRed);
  doc.restore();
  doc.fillOpacity(1);
  doc.rect(0, H - 5, PAGE.w, 5).fill(C.red);

  doc.image(LOGO, 58, 52, { width: 70, height: 70 });
  doc.font("B").fontSize(7.5).fillColor(C.red).text(`PÔLE ${poleName.toUpperCase()}`, 146, 62, { characterSpacing: 0.4 });
  doc.font("XB").fontSize(20).fillColor("#FFFFFF").text("Contrat de collaboration\nindépendante", 146, 76, { lineGap: 1 });
  doc.font("B").fontSize(13).fillColor("#FFFFFF").text(`Poste : ${roleTitle}`, 58, 150);
  doc.font("R").fontSize(8).fillColor("#A89A9A").text(`Version du contrat : ${STAFF_CONTRACT_VERSION}   ·   Réf. ${roleKey}`, 58, 176);
  doc.text("Contrat de prestation de services entre indépendants, pas un contrat de travail salarié.", 58, 192);
  doc.y = H + 30;
}

function partiesBlock(doc: Doc) {
  doc.font("B").fontSize(11).fillColor(C.text).text("Entre les parties", M.left, doc.y);
  const top = doc.y + 8;
  const colW = (W - 10) / 2;
  const h = 146;
  for (const x of [M.left, M.left + colW + 10]) {
    doc.rect(x, top, colW, h).fill(C.panel);
    doc.rect(x, top, 2.5, h).fill(C.red);
  }
  const lx = M.left + 12;
  const rx = M.left + colW + 22;
  const tw = colW - 22;

  doc.font("B").fontSize(7).fillColor(C.red).text("EP COACHING", lx, top + 10);
  doc.fillColor(C.text).fontSize(8.5);
  doc.font("B").text(COMPANY.name, lx, top + 24, { width: tw, continued: true }).font("R").text(`, exploitée par ${COMPANY.legal}`);
  doc.moveDown(0.5).text(`SIRET ${COMPANY.siret}`, { width: tw });
  doc.moveDown(0.5).text(COMPANY.address, { width: tw });
  doc.moveDown(0.5).text(COMPANY.email, { width: tw });
  doc.moveDown(0.5).text("ci-après « EP Coaching »", { width: tw });

  doc.font("B").fontSize(7).fillColor(C.red).text("LE PRESTATAIRE", rx, top + 10);
  doc.font("R").fontSize(8.5).fillColor(C.text);
  doc.text("Nom complet : ____________________________", rx, top + 24, { width: tw });
  doc.moveDown(0.7).text("Email : ________________________________", { width: tw });
  doc.moveDown(0.7).text("Agissant en qualité de prestataire indépendant", { width: tw });
  doc.moveDown(0.7).text("Statut / SIRET : _______________________", { width: tw });
  doc.moveDown(0.7).text("ci-après « le Prestataire »", { width: tw });

  doc.x = M.left;
  doc.y = top + h + 22;
}

function articleTitle(doc: Doc, num: string, title: string) {
  ensureSpace(doc, 70);
  const y = doc.y;
  doc.font("XB").fontSize(11).fillColor(C.red).text(num, M.left, y, { width: 22 });
  doc.font("B").fontSize(11).fillColor(C.text).text(title, M.left + 26, y, { width: W - 26 });
  const lineY = Math.max(doc.y, y + 14) + 3;
  doc.moveTo(M.left, lineY).lineTo(M.left + W, lineY).lineWidth(0.5).strokeColor(C.line).stroke();
  doc.x = M.left;
  doc.y = lineY + 7;
}

function paragraph(doc: Doc, text: string) {
  doc.font("R").fontSize(9).fillColor(C.text).text(text, M.left, doc.y, { width: W, lineGap: 3.2, align: "left" });
  doc.moveDown(0.55);
}

function bullets(doc: Doc, items: string[]) {
  for (const item of items) {
    ensureSpace(doc, 16);
    const y = doc.y;
    doc.font("R").fontSize(9).fillColor(C.text).text("•", M.left + 4, y);
    doc.text(item, M.left + 16, y, { width: W - 16, lineGap: 3.2 });
    doc.moveDown(0.3);
  }
  doc.x = M.left;
  doc.moveDown(0.3);
}

function goldBox(doc: Doc, text: string) {
  doc.font("R").fontSize(9);
  const h = doc.heightOfString(text, { width: W - 26, lineGap: 3 }) + 30;
  ensureSpace(doc, h + 8);
  const top = doc.y;
  doc.rect(M.left, top, W, h).fill(C.goldBg);
  doc.rect(M.left, top, 2.5, h).fill(C.gold);
  doc.font("B").fontSize(6.8).fillColor(C.red).text("CE QUE ÇA REPRÉSENTE CONCRÈTEMENT (À TITRE INDICATIF)", M.left + 13, top + 9, { characterSpacing: 0.2 });
  doc.font("R").fontSize(9).fillColor(C.text).text(text, M.left + 13, top + 21, { width: W - 26, lineGap: 3 });
  doc.x = M.left;
  doc.y = top + h + 12;
}

function signatures(doc: Doc) {
  ensureSpace(doc, 190);
  doc.moveDown(0.8);
  doc.font("B").fontSize(13).fillColor(C.text).text("Signatures", M.left, doc.y);
  doc.moveDown(0.3);
  doc.font("R").fontSize(8).fillColor(C.muted).text(
    "Signature électronique via le formulaire sécurisé EP Coaching (JotForm) : l'horodatage, l'adresse IP et la version du contrat sont enregistrés et font foi. Une copie signée est envoyée par email aux deux parties.",
    { width: W, lineGap: 2 }
  );
  const top = doc.y + 10;
  const colW = W / 2;
  const h = 130;
  doc.rect(M.left, top, W, h).lineWidth(0.6).strokeColor(C.line).stroke();
  doc.rect(M.left, top, W, 2.5).fill(C.red);
  doc.moveTo(M.left + colW, top).lineTo(M.left + colW, top + h).lineWidth(0.6).strokeColor(C.line).stroke();

  const lx = M.left + 12;
  const rx = M.left + colW + 12;
  const tw = colW - 24;
  doc.font("B").fontSize(7).fillColor(C.red).text("POUR EP COACHING", lx, top + 12);
  doc.font("R").fontSize(9).fillColor(C.text).text("Emmanuel Peccoux, fondateur", lx, top + 26, { width: tw });
  doc.moveDown(0.8).text("Fait à Annecy, le ____ / ____ / ________", { width: tw });
  doc.font("R").fontSize(7.5).fillColor(C.light).text("Signature", lx, top + h - 26);

  doc.font("B").fontSize(7).fillColor(C.red).text("LE PRESTATAIRE", rx, top + 12);
  doc.font("R").fontSize(9).fillColor(C.text).text("Nom : ____________________________", rx, top + 26, { width: tw });
  doc.moveDown(0.8).text("Fait à ___________, le ____ / ____ / _____", { width: tw });
  doc.moveDown(0.8).text("Mention « Lu et approuvé » : _____________", { width: tw });
  doc.font("R").fontSize(7.5).fillColor(C.light).text("Signature", rx, top + h - 26);
  doc.x = M.left;
  doc.y = top + h + 10;
}

// En-tête des pages suivantes, pied de page et numéros : posés à la fin,
// une fois le nombre de pages connu.
function decorate(doc: Doc, roleTitle: string) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const saved = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    if (i > 0) {
      doc.rect(0, 0, PAGE.w, 38).fill(C.dark);
      doc.rect(0, 38, PAGE.w, 2).fill(C.red);
      doc.image(LOGO, 58, 8, { width: 22, height: 22 });
      doc.font("B").fontSize(8.5).fillColor("#FFFFFF").text("EP Coaching  ·  Contrat de collaboration indépendante", 90, 15, { lineBreak: false });
      doc.font("R").fontSize(8.5).fillColor("#D8C8C8").text(roleTitle, PAGE.w - 60 - 180, 15, { width: 180, align: "right", lineBreak: false });
    }
    const fy = PAGE.h - 52;
    doc.moveTo(M.left, fy).lineTo(PAGE.w - M.right, fy).lineWidth(0.5).strokeColor(C.line).stroke();
    doc.font("R").fontSize(6.8).fillColor(C.light);
    doc.text(`${COMPANY.name} · ${COMPANY.legal} · SIRET ${COMPANY.siret}`, M.left, fy + 8, { width: W - 120, lineBreak: false });
    doc.text(`${COMPANY.address} · Contrat v${STAFF_CONTRACT_VERSION}`, M.left, fy + 18, { width: W - 120, lineBreak: false });
    doc.font("B").fontSize(8).fillColor(C.red).text(`Page ${i + 1}`, PAGE.w - M.right - 120, fy + 7, { width: 120, align: "right", lineBreak: false });
    doc.font("R").fontSize(7).fillColor(C.light).text("Paraphe : ________", PAGE.w - M.right - 120, fy + 19, { width: 120, align: "right", lineBreak: false });
    doc.page.margins.bottom = saved;
  }
}

function generate(roleKey: string): Promise<string> {
  const contract = buildStaffContract(roleKey, "", "");
  const role = POLES.flatMap((p) => p.roles).find((r) => r.key === roleKey);
  if (!contract || !role) throw new Error(`Poste inconnu : ${roleKey}`);

  const doc = new PDFDocument({
    size: "A4",
    margins: M,
    bufferPages: true,
    info: {
      Title: `Contrat de collaboration indépendante, ${contract.roleTitle}`,
      Author: COMPANY.name,
      Subject: `Contrat ${STAFF_CONTRACT_VERSION}`,
    },
  });
  fonts(doc);
  const file = join(OUT, `${roleKey}.pdf`);
  const stream = createWriteStream(file);
  doc.pipe(stream);

  firstPageHeader(doc, contract.poleName, contract.roleTitle, roleKey);
  partiesBlock(doc);

  for (const article of contract.articles.slice(1)) {
    const m = /^(\d+)\.\s*(.*)$/.exec(article.title);
    articleTitle(doc, m ? m[1] : "", m ? m[2] : article.title);
    for (const p of article.paragraphs) paragraph(doc, p);
    if (article.bullets?.length) bullets(doc, article.bullets);
    if (m?.[1] === "3" && role.compensation.earnings) goldBox(doc, role.compensation.earnings);
  }
  signatures(doc);
  decorate(doc, contract.roleTitle);
  doc.end();
  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(file));
    stream.on("error", reject);
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const all = POLES.flatMap((p) => p.roles.map((r) => r.key));
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const keys = wanted.length ? wanted : all;
  for (const k of keys) {
    const file = await generate(k);
    console.log(`OK  ${k}  ->  ${file}`);
  }
  console.log(`\n${keys.length} contrat(s) généré(s), version ${STAFF_CONTRACT_VERSION}. Envoi : npm run contracts:upload`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
