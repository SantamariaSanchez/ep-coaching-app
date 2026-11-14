import { test } from "node:test";
import assert from "node:assert/strict";
import { canBrowseLeadMagnetLibrary, FREE_TIER_DAYS, freeTierStatus, freeTierUrgencyLabel } from "../free-tier";

const now = new Date("2026-11-14T12:00:00Z");
const startedDaysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

test("freeTierStatus : ne concerne que le membre gratuit avec une date de départ", () => {
  assert.equal(freeTierStatus(null, "membre_gratuit", now).applies, false);
  assert.equal(freeTierStatus({ free_tier_started_at: startedDaysAgo(90) }, "client_accompagne", now).locked, false);
  assert.equal(freeTierStatus({ free_tier_started_at: null }, "membre_gratuit", now).applies, false);
  assert.equal(freeTierStatus({ free_tier_started_at: "pas une date" }, "membre_gratuit", now).applies, false);
});

test("freeTierStatus : décompte, échéance et verrou", () => {
  const mid = freeTierStatus({ free_tier_started_at: startedDaysAgo(10) }, "membre_gratuit", now);
  assert.deepEqual([mid.applies, mid.daysUsed, mid.daysLeft, mid.expired, mid.locked], [true, 10, FREE_TIER_DAYS - 10, false, false]);
  const lastDay = freeTierStatus({ free_tier_started_at: startedDaysAgo(FREE_TIER_DAYS - 1) }, "membre_gratuit", now);
  assert.deepEqual([lastDay.daysLeft, lastDay.locked], [1, false]);
  const over = freeTierStatus({ free_tier_started_at: startedDaysAgo(FREE_TIER_DAYS) }, "membre_gratuit", now);
  assert.deepEqual([over.daysLeft, over.expired, over.locked], [0, true, true]);
  // Verrou posé par le cron avant l'échéance : il compte quand même.
  assert.equal(freeTierStatus({ free_tier_started_at: startedDaysAgo(5), locked_at: now.toISOString() }, "membre_gratuit", now).locked, true);
  // Date de départ dans le futur (horloge décalée) : jamais de jours négatifs.
  assert.equal(freeTierStatus({ free_tier_started_at: startedDaysAgo(-3) }, "membre_gratuit", now).daysUsed, 0);
});

test("freeTierUrgencyLabel", () => {
  const at = (d: number) => freeTierUrgencyLabel(freeTierStatus({ free_tier_started_at: startedDaysAgo(d) }, "membre_gratuit", now));
  assert.equal(at(10), null);
  assert.equal(at(FREE_TIER_DAYS - 21), "21 jours d'accès gratuit restants");
  assert.equal(at(FREE_TIER_DAYS - 7), "Plus que 7 jours d'accès gratuit");
  assert.equal(at(FREE_TIER_DAYS - 1), "Plus que 1 jour d'accès gratuit");
  assert.equal(at(FREE_TIER_DAYS + 3), "Ton accès gratuit est terminé");
  assert.equal(freeTierUrgencyLabel(freeTierStatus(null, "membre_gratuit", now)), null);
});

test("canBrowseLeadMagnetLibrary", () => {
  assert.equal(canBrowseLeadMagnetLibrary("membre_gratuit"), false);
  assert.equal(canBrowseLeadMagnetLibrary("client_accompagne"), true);
});
