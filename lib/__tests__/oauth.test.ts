import test from "node:test";
import assert from "node:assert/strict";
import {
  OAUTH_ERROR_MESSAGES, cleanInviteCode, decodeCtx, encodeCtx, oauthErrorPath, parseProvider, parseRole,
} from "../oauth";

test("seuls Google et Apple sont acceptés", () => {
  assert.equal(parseProvider("google"), "google");
  assert.equal(parseProvider("apple"), "apple");
  assert.equal(parseProvider("facebook"), null);
  assert.equal(parseProvider(null), null);
});

test("le rôle par défaut est client", () => {
  assert.equal(parseRole("coach"), "coach");
  assert.equal(parseRole("admin"), "client");
  assert.equal(parseRole(undefined), "client");
});

test("le code d'invitation n'accepte que lettres et chiffres", () => {
  assert.equal(cleanInviteCode("abc123XYZ"), "abc123XYZ");
  assert.equal(cleanInviteCode("a b"), undefined);
  assert.equal(cleanInviteCode("x'; drop"), undefined);
  assert.equal(cleanInviteCode("ab"), undefined);
});

test("le contexte survit à l'aller-retour du cookie", () => {
  const raw = encodeCtx({ role: "client", coach: "DEMO1A2B", ref: "abcd" });
  assert.deepEqual(decodeCtx(raw), { role: "client", coach: "DEMO1A2B", ref: "abcd" });
});

test("un cookie illisible ou falsifié retombe sur un membre sans code", () => {
  assert.deepEqual(decodeCtx("%%%"), { role: "client" });
  assert.deepEqual(decodeCtx(undefined), { role: "client" });
  const forged = encodeURIComponent(JSON.stringify({ role: "owner", coach: "<script>" }));
  assert.deepEqual(decodeCtx(forged), { role: "client", coach: undefined, ref: undefined });
});

test("chaque erreur a un message et un retour vers la bonne page", () => {
  for (const code of Object.keys(OAUTH_ERROR_MESSAGES)) {
    assert.ok(OAUTH_ERROR_MESSAGES[code as keyof typeof OAUTH_ERROR_MESSAGES].length > 10);
  }
  assert.equal(oauthErrorPath("coach", "failed"), "/auth/coach?oauth_error=failed");
  assert.equal(oauthErrorPath("client", "provider_disabled"), "/auth/client?mode=login&oauth_error=provider_disabled");
});
