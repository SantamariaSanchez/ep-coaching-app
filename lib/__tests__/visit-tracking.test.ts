import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldTrack, referrerHost, cleanVisit, visitGroup, funnelSteps } from "../visit-tracking";

test("seules les pages publiques comptent", () => {
  assert.equal(shouldTrack("/"), true);
  assert.equal(shouldTrack("/ressources/guide-macros"), true);
  assert.equal(shouldTrack("/auth/client"), true);
  assert.equal(shouldTrack("/dashboard/client"), false);
  assert.equal(shouldTrack("/api/public/visit"), false);
  assert.equal(shouldTrack("/equipe"), false);
  assert.equal(shouldTrack("/go/abc"), false);
  assert.equal(shouldTrack("/guides"), true);
  assert.equal(shouldTrack("https://x.com"), false);
});

test("origine : l'hôte seul, jamais le chemin, rien si interne", () => {
  assert.equal(referrerHost("https://www.instagram.com/p/abc?x=1"), "instagram.com");
  assert.equal(referrerHost("https://ep-coaching.vercel.app/ressources", "ep-coaching.vercel.app"), null);
  assert.equal(referrerHost("pas une url"), null);
});

test("visite nettoyée : pas de paramètres, utm validé", () => {
  assert.deepEqual(cleanVisit({ path: "/ressources?email=a@b.c", ref: null, utm: "Instagram" }), { path: "/ressources", referrer_host: null, utm_source: "instagram" });
  assert.equal(cleanVisit({ path: "/dashboard/coach" }), null);
  assert.equal(cleanVisit({ path: 42 }), null);
  assert.equal(cleanVisit({ path: "/", utm: "<script>" })?.utm_source, null);
});

test("groupes et tunnel", () => {
  assert.equal(visitGroup("/"), "accueil");
  assert.equal(visitGroup("/ressources/x"), "ressources");
  assert.equal(visitGroup("/auth/client"), "inscription");
  const s = funnelSteps({ visits: 200, resourceVisits: 50, signupPageVisits: 20, leads: 5, candidatures: 2, signups: 4, onboarded: 1 });
  assert.equal(s[3].rate, 10);
  assert.equal(s[5].rate, 20);
  assert.equal(funnelSteps({ visits: 0, resourceVisits: 0, signupPageVisits: 0, leads: 0, candidatures: 0, signups: 0, onboarded: 0 })[1].rate, null);
});
