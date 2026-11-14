import { test } from "node:test";
import assert from "node:assert/strict";
import { isActiveContentType, storageFileHeaders, UNTRUSTED_DOC_CSP } from "../untrusted-html";

test("bac à sable sur les types exécutables seulement", () => {
  for (const t of ["text/html; charset=utf-8", "image/svg+xml", "TEXT/HTML", "application/xhtml+xml"]) assert.equal(isActiveContentType(t), true, t);
  for (const t of ["application/pdf", "image/png", "video/mp4", "", null]) assert.equal(isActiveContentType(t), false, String(t));
  assert.equal(storageFileHeaders("text/html; charset=utf-8", "no-cache")["Content-Security-Policy"], UNTRUSTED_DOC_CSP);
  assert.equal(storageFileHeaders("application/pdf", "no-cache")["Content-Security-Policy"], undefined);
  // Jamais la même origine que l'appli : c'est ce qui protège la session.
  assert.ok(!UNTRUSTED_DOC_CSP.includes("allow-same-origin"));
});
