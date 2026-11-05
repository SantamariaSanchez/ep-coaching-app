import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SCRIPT_CONTENT_MAX } from "../script-limits";

test("scripts du Studio : un YouTube de 2 h 30 tient dans une limite de contenu", () => {
  // 2,3 mots par seconde x 9 000 secondes = 20 700 mots, environ 6,3 caractères par mot (espace compris).
  const longest = Math.round(2.3 * 9000 * 6.3);
  assert.ok(SCRIPT_CONTENT_MAX >= longest, `${SCRIPT_CONTENT_MAX} < ${longest}`);
});

test("scripts du Studio : les outils du connecteur n'utilisent plus la limite de 20 000 caractères", () => {
  for (const file of ["../mcp-tools.ts", "../mcp-tools-daily.ts"]) {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(src, /SCRIPT_CONTENT_MAX/, file);
    assert.doesNotMatch(src, /contenu[^\n]*20000/, file);
  }
});
