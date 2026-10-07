// Prépare un composant client à la traduction : entoure les textes JSX et
// les attributs lisibles (placeholder, aria-label, title, alt) de t("..."),
// puis ajoute `const t = useT();` dans chaque composant concerné.
// Usage : node scripts/i18n-wrap.mjs fichier1.tsx fichier2.tsx ...
// Ne touche qu'aux fichiers "use client". Relire le diff, puis lancer
// node scripts/i18n-missing.mjs pour compléter lib/i18n-en.ts.
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const ATTRS = new Set(["placeholder", "aria-label", "title", "alt"]);
const ENTITIES = { "&apos;": "'", "&quot;": '"', "&amp;": "&", "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&rsquo;": "’", "&laquo;": "«", "&raquo;": "»" };
const decode = (s) => s.replace(/&[a-z]+;/g, (e) => ENTITIES[e] ?? e);
const hasWords = (s) => /[A-Za-zÀ-ÿ]{2,}/.test(s);

for (const file of process.argv.slice(2)) {
  let src = readFileSync(file, "utf8");
  // Composant client : hook useT(). Page ou composant serveur async :
  // await getT(). Un composant serveur non async est laissé de côté.
  const isClient = /^\s*["']use client["']/.test(src);
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  // Nom du traducteur : t, sauf si le fichier utilise déjà un identifiant t.
  let usesT = false;
  const findT = (n) => {
    if (ts.isIdentifier(n) && n.text === "t" && !(ts.isCallExpression(n.parent) && n.parent.expression === n)) usesT = true;
    ts.forEachChild(n, findT);
  };
  findT(sf);
  const already = /\bconst t = (useT\(\)|await getT\(\))/.test(src);
  const T = already ? "t" : usesT ? "tr" : "t";

  const edits = []; // {start, end, text}
  const components = new Set(); // positions des corps de fonction à compléter

  const componentOf = (node) => {
    // Composant le plus extérieur (nom en majuscule) qui contient ce nœud.
    let found = null;
    for (let p = node.parent; p; p = p.parent) {
      let name = null;
      if (ts.isFunctionDeclaration(p) && p.name) name = p.name.text;
      else if ((ts.isArrowFunction(p) || ts.isFunctionExpression(p)) && ts.isVariableDeclaration(p.parent) && ts.isIdentifier(p.parent.name)) name = p.parent.name.text;
      const isAsync = !!p.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
      if (name && /^[A-Z]/.test(name) && p.body && ts.isBlock(p.body) && (isClient || isAsync)) found = p;
    }
    return found;
  };

  // Littéral rendu directement comme texte : remonte des ternaires, && et
  // parenthèses jusqu'à un {...} enfant d'un élément JSX (pas un attribut).
  const inJsxText = (node) => {
    let child = node;
    for (let p = node.parent; p; child = p, p = p.parent) {
      if (ts.isParenthesizedExpression(p)) continue;
      if (ts.isConditionalExpression(p)) {
        if (p.condition === child) return false;
        continue;
      }
      if (ts.isBinaryExpression(p) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(p.operatorToken.kind)) {
        if (p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && p.left === child) return false;
        continue;
      }
      return ts.isJsxExpression(p) && (ts.isJsxElement(p.parent) || ts.isJsxFragment(p.parent));
    }
    return false;
  };

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const raw = node.getFullText(sf);
      if (hasWords(raw)) {
        const comp = componentOf(node);
        if (comp) {
          const lead = raw.match(/^\s*/)[0];
          const trail = raw.match(/\s*$/)[0];
          const core = raw.slice(lead.length, raw.length - trail.length);
          const text = decode(core.replace(/\s*\n\s*/g, " "));
          // Espaces significatifs collés à une expression voisine : conservés.
          const keepLead = lead && !lead.includes("\n") ? "{\" \"}" : "";
          const keepTrail = trail && !trail.includes("\n") ? "{\" \"}" : "";
          edits.push({ start: node.getFullStart(), end: node.getEnd(), text: `${lead.includes("\n") ? lead : ""}${keepLead}{${T}(${JSON.stringify(text)})}${keepTrail}${trail.includes("\n") ? trail : ""}` });
          components.add(comp);
        }
      }
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && hasWords(node.text) && inJsxText(node)) {
      // {cond ? "Activées" : "Non activées"} ou {x && "Envoyée"} affichés tels quels.
      const comp = componentOf(node);
      if (comp) {
        edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `${T}(${JSON.stringify(node.text)})` });
        components.add(comp);
      }
    } else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = node.name.getText(sf);
      const val = node.initializer.text;
      if (ATTRS.has(name) && hasWords(val)) {
        const comp = componentOf(node);
        if (comp) {
          edits.push({ start: node.initializer.getStart(sf), end: node.initializer.getEnd(), text: `{${T}(${JSON.stringify(val)})}` });
          components.add(comp);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (!edits.length) {
    console.log(`rien à traduire : ${file}`);
    continue;
  }
  if (!already) {
    for (const comp of components) {
      const body = comp.body;
      if (new RegExp(`const ${T} = (useT\\(\\)|await getT\\(\\))`).test(body.getText(sf))) continue;
      edits.push({ start: body.getStart(sf) + 1, end: body.getStart(sf) + 1, text: isClient ? `\n  const ${T} = useT();` : `\n  const ${T} = await getT();` });
    }
  }
  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) src = src.slice(0, e.start) + e.text + src.slice(e.end);
  if (!isClient) {
    if (!src.includes('from "@/lib/i18n-server"')) src = `import { getT } from "@/lib/i18n-server";\n` + src;
  } else if (!src.includes('from "@/components/i18n/I18nProvider"')) {
    src = src.replace(/(^\s*["']use client["'];?[ \t]*\r?\n)\s*/, `$1\nimport { useT } from "@/components/i18n/I18nProvider";\n`);
  }
  writeFileSync(file, src);
  console.log(`${edits.length} modifs (${T}) : ${file}`);
}
