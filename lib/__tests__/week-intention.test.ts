import test from "node:test";
import assert from "node:assert/strict";
import { formatReflectionContent, pickWeekIntention } from "../weekly-review-helpers";

const entry = (date: string, intention: string) => ({
  entry_date: date,
  content: formatReflectionContent("2026-11-02", { victory: "4 séances", blocker: "", intention }),
});

test("pickWeekIntention renvoie l'intention de la revue la plus récente", () => {
  const got = pickWeekIntention([entry("2026-11-01", "ancienne"), entry("2026-11-08", "au lit avant minuit")], "2026-11-10");
  assert.equal(got, "au lit avant minuit");
});

test("pickWeekIntention ignore une revue trop ancienne ou sans intention", () => {
  assert.equal(pickWeekIntention([entry("2026-10-20", "trop vieux")], "2026-11-10"), null);
  assert.equal(pickWeekIntention([entry("2026-11-08", "")], "2026-11-10"), null);
  assert.equal(pickWeekIntention([], "2026-11-10"), null);
});

test("pickWeekIntention passe à la revue précédente si la plus récente n'a pas d'intention", () => {
  const got = pickWeekIntention([entry("2026-11-09", ""), entry("2026-11-05", "marcher 8 000 pas")], "2026-11-10");
  assert.equal(got, "marcher 8 000 pas");
});

test("pickWeekIntention tronque un texte trop long et refuse une date invalide", () => {
  const long = "x".repeat(400);
  const got = pickWeekIntention([entry("2026-11-08", long)], "2026-11-10");
  assert.ok(got && got.length <= 280);
  assert.equal(pickWeekIntention([entry("2026-11-08", "ok")], "pas une date"), null);
});
