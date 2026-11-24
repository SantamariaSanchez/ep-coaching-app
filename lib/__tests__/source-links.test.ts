import test from "node:test";
import assert from "node:assert/strict";
import { auditRedirect, isAuditLink, sourceRedirect } from "../source-links";

test("lien de bio : page publique + source", () => {
  assert.equal(sourceRedirect("instagram"), "/?src=instagram");
  assert.equal(sourceRedirect("IG", ["ressources"]), "/ressources?src=instagram");
  assert.equal(sourceRedirect("mail", ["auth", "client"]), "/auth/client?src=brevo");
  assert.equal(sourceRedirect("yt", ["ressources", "guide-macros"]), "/ressources/guide-macros?src=youtube");
});

test("jamais vers un autre site ni l'espace connecté", () => {
  assert.equal(sourceRedirect("instagram", ["%2F%2Fevil.com"]), "/?src=instagram");
  assert.equal(sourceRedirect("instagram", ["dashboard", "coach"]), "/?src=instagram");
  assert.equal(sourceRedirect("inconnu"), null);
});

test("lien de bio vers l'audit : Calendly avec la source", () => {
  assert.equal(isAuditLink(["audit"]), true);
  assert.equal(isAuditLink(["Audit"]), true);
  assert.equal(isAuditLink(["audit", "x"]), false);
  assert.equal(isAuditLink([]), false);
  assert.equal(auditRedirect("ig"), "https://calendly.com/peccoux-manu/audit-strategique?utm_source=instagram&utm_medium=bio");
  assert.equal(auditRedirect("inconnu"), null);
});
