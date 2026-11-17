import test from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../safe-next";

test("une page de son propre espace est gardée, paramètres compris", () => {
  assert.equal(safeNext("/dashboard/client/nutrition?jour=lun", "client"), "/dashboard/client/nutrition?jour=lun");
  assert.equal(safeNext("/dashboard/coach/clients/abc", "coach"), "/dashboard/coach/clients/abc");
  assert.equal(safeNext("/dashboard/client", "client"), "/dashboard/client");
});

test("autre site, autre espace ou chemin piégé : refusé", () => {
  assert.equal(safeNext("https://evil.com", "client"), null);
  assert.equal(safeNext("//evil.com/dashboard/client", "client"), null);
  assert.equal(safeNext("/dashboard/coach/clients", "client"), null);
  assert.equal(safeNext("/dashboard/client/../coach", "client"), null);
  assert.equal(safeNext("/dashboard/clientX", "client"), null);
  assert.equal(safeNext("/\\evil.com", "client"), null);
  assert.equal(safeNext(null, "client"), null);
});
