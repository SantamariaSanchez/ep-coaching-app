import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignDecision, type AdCampaign } from "../ad-campaigns";

const base = (p: Partial<AdCampaign>): AdCampaign =>
  ({ id: "x", coach_id: "c", name: "n", platform: "meta", objective: "leads", status: "active", budget_daily: null, budget_total: null,
     spend_total: 100, impressions: 10000, clicks: 200, leads: 10, revenue_generated: null, start_date: "2026-11-01", end_date: null,
     notes: null, stopped_reason: null, created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z", ...p }) as AdCampaign;

test("coupe une campagne qui dépense sans lead", () => {
  assert.equal(campaignDecision(base({ leads: 0 }), 10, "2026-11-13")?.kind, "couper");
});

test("attend tant qu'il y a trop peu de leads", () => {
  assert.equal(campaignDecision(base({ leads: 2, spend_total: 20 }), 10, "2026-11-13")?.kind, "attendre");
});

test("scale quand le lead est bien moins cher que la moyenne", () => {
  assert.equal(campaignDecision(base({ spend_total: 50, leads: 10 }), 10, "2026-11-13")?.kind, "scaler");
});

test("coupe quand le lead coûte bien plus que la moyenne", () => {
  assert.equal(campaignDecision(base({ spend_total: 200, leads: 10 }), 10, "2026-11-13")?.kind, "couper");
});

test("rien pour une campagne en pause", () => {
  assert.equal(campaignDecision(base({ status: "pausee" }), 10, "2026-11-13"), null);
});
