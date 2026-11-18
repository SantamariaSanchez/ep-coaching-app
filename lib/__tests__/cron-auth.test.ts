import test from "node:test";
import assert from "node:assert/strict";
import { cronBearer } from "../cron-auth";

test("sans secret, aucun en-tête ne passe (pas de « Bearer undefined »)", () => {
  const prev = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  assert.notEqual(cronBearer(), "Bearer undefined");
  assert.notEqual(cronBearer(), cronBearer());
  process.env.CRON_SECRET = "   ";
  assert.notEqual(cronBearer(), "Bearer    ");
  process.env.CRON_SECRET = "un-secret-assez-long-pour-passer";
  assert.equal(cronBearer(), "Bearer un-secret-assez-long-pour-passer");
  if (prev === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = prev;
});
