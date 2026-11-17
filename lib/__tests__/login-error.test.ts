import test from "node:test";
import assert from "node:assert/strict";
import { classifyLoginError } from "../login-error";

test("mauvais identifiants", () => {
  assert.equal(classifyLoginError({ status: 400, code: "invalid_credentials", message: "Invalid login credentials" }), "credentials");
  assert.equal(classifyLoginError(null), "credentials");
});
test("email non confirmé", () => {
  assert.equal(classifyLoginError({ status: 400, code: "email_not_confirmed" }), "unconfirmed");
});
test("quota ou panne : pas un échec d'identifiants", () => {
  assert.equal(classifyLoginError({ status: 429, code: "over_request_rate_limit" }), "busy");
  assert.equal(classifyLoginError({ status: 503 }), "busy");
  assert.equal(classifyLoginError({ message: "fetch failed" }), "busy");
});
