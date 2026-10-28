import test from "node:test";
import assert from "node:assert/strict";
import { computeNav, COACH_SIDEBAR } from "../../components/ui/DashboardNav";

// Demande d'Emmanuel (2026-10-28) : « Business » doit ouvrir le Studio
// créatif en premier, pas « Ma niche et mon avatar ».
test("Business (coach) ouvre le Studio créatif", () => {
  const nav = computeNav("/dashboard/coach", false, false, false);
  const business = nav.tabs.find((t) => t.label === "Business");
  assert.ok(business);
  assert.equal(business.href, "/dashboard/coach/studio");
});

test("le premier élément du groupe Mon business est le Studio créatif", () => {
  const group = COACH_SIDEBAR.find((g) => g.group === "Mon business");
  assert.equal(group?.items[0].segment, "studio");
  assert.equal(group?.items[0].label, "Studio créatif");
});

test("si le Studio est coupé dans Mon appli, Business ouvre l'outil suivant", () => {
  const nav = computeNav("/dashboard/coach", false, false, false, new Set(["studio"]));
  const business = nav.tabs.find((t) => t.label === "Business");
  assert.equal(business?.href, "/dashboard/coach/stats-reseaux");
});

test("la barre du bas ne dépasse jamais 5 entrées", () => {
  for (const path of ["/dashboard/coach", "/dashboard/client"]) {
    assert.ok(computeNav(path, false, false, false).tabs.length <= 5);
  }
});

test("sur la page Business, les sous-onglets commencent par le Studio créatif", () => {
  const nav = computeNav("/dashboard/coach/studio", false, false, false);
  assert.equal(nav.mobileSubItems[0]?.segment, "studio");
});
