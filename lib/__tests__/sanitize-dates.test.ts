import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanNumber, cleanText, escapeHtml, escapeLikePattern, requireText, safeExternalUrl } from "../sanitize";
import { addMinutesToHhmm, isWithinBilanBackfillWindow, timeAwareGreeting, todayInParis } from "../dates";

test("safeExternalUrl : http(s) et chemins internes seulement", () => {
  assert.equal(safeExternalUrl("https://exemple.fr/a?b=1"), "https://exemple.fr/a?b=1");
  assert.equal(safeExternalUrl("/dashboard/client"), "/dashboard/client");
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.com", "/\\evil.com", "/a\\b", "", "   ", 42, null]) {
    assert.equal(safeExternalUrl(bad), null, String(bad));
  }
});

test("cleanText : contrôle, bornes, vide", () => {
  assert.equal(cleanText("  a\u0000b\u007f  ", 10), "ab");
  assert.equal(cleanText("ligne1\nligne2", 20), "ligne1\nligne2");
  assert.equal(cleanText("abcdef", 3), "abc");
  assert.equal(cleanText("   ", 5), null);
  assert.equal(cleanText(12, 5), null);
});

test("requireText : refuse trop long au lieu de tronquer", () => {
  assert.deepEqual(requireText("abc", 3, "Nom"), { ok: true, value: "abc" });
  assert.equal(requireText("abcd", 3, "Nom").ok, false);
  assert.equal(requireText("", 3, "Nom").ok, false);
});

test("cleanNumber : bornes et entiers", () => {
  assert.equal(cleanNumber("12.6", { min: 0, max: 20, integer: true }), 13);
  assert.equal(cleanNumber(21, { min: 0, max: 20 }), null);
  assert.equal(cleanNumber("abc", { min: 0, max: 20 }), null);
  assert.equal(cleanNumber("", { min: 0, max: 20 }), null);
  assert.equal(cleanNumber(Infinity, { min: 0, max: 20 }), null);
});

test("escapeHtml et escapeLikePattern", () => {
  assert.equal(escapeHtml(`<a href="x">'&</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&lt;/a&gt;");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeLikePattern("50%_a\\b"), "50\\%\\_a\\\\b");
});

test("addMinutesToHhmm", () => {
  assert.equal(addMinutesToHhmm("20:00", 15), "20:15");
  assert.equal(addMinutesToHhmm("21:50", 15), "22:05");
  assert.equal(addMinutesToHhmm("23:50", 15), "00:05");
});

test("isWithinBilanBackfillWindow", () => {
  const today = todayInParis();
  assert.equal(isWithinBilanBackfillWindow(today), true);
  assert.equal(isWithinBilanBackfillWindow("2999-01-01"), false);
  assert.equal(isWithinBilanBackfillWindow("2020-01-01"), false);
});

test("timeAwareGreeting", () => {
  assert.equal(timeAwareGreeting(3), "Bonne nuit");
  assert.equal(timeAwareGreeting(9), "Bonjour");
  assert.equal(timeAwareGreeting(15), "Bon après-midi");
  assert.equal(timeAwareGreeting(20), "Bonsoir");
});
