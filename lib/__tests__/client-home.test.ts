import { test } from "node:test";
import assert from "node:assert/strict";
import { bilanTimeOf, buildTodos, dayStrip, mealLabelsOf, minutesLabel, pickNow, visibleTodos, weeksSince, type HomeBlock, type HomeDayData } from "../client-home";

const blk = (id: string, start: string, end: string, extra: Partial<HomeBlock> = {}): HomeBlock => ({
  id, start, end, label: id, kind: "autre" as HomeBlock["kind"], icon: null, tasks: [], action: "agenda", href: "/x", mealSlot: null, steps: null, marker: false, ...extra,
});

test("pickNow : bloc en cours, suivant, fin de journée", () => {
  const blocks = [blk("reveil", "07:00", "07:05", { marker: true }), blk("a", "08:00", "09:00"), blk("b", "10:00", "11:00"), blk("c", "12:00", "13:00")];
  const during = pickNow(blocks, "08:30");
  assert.equal(during.current?.id, "a");
  assert.equal(during.next?.id, "b");
  assert.equal(during.minutesLeft, 30);
  assert.equal(during.progress, 0.5);
  assert.deepEqual(during.later.map((b) => b.id), ["b", "c"]);
  const between = pickNow(blocks, "09:30");
  assert.equal(between.current, null);
  assert.equal(between.next?.id, "b");
  assert.equal(between.minutesLeft, 30);
  assert.deepEqual(between.later.map((b) => b.id), ["c"]);
  assert.equal(pickNow(blocks, "14:00").dayOver, true);
  // Le réveil n'est jamais « le bloc en cours ».
  assert.equal(pickNow(blocks, "07:02").current, null);
});

test("pickNow : trajet juste avant la séance, la séance prend la vedette", () => {
  const blocks = [blk("trajet", "17:30", "18:00", { kind: "trajet" as HomeBlock["kind"] }), blk("seance", "18:00", "19:00", { action: "seance" })];
  const n = pickNow(blocks, "17:40");
  assert.equal(n.current, null);
  assert.equal(n.during?.id, "trajet");
  assert.equal(n.next?.id, "seance");
});

test("pickNow : bloc qui finit à minuit", () => {
  const n = pickNow([blk("nuit", "22:00", "00:00")], "23:00");
  assert.equal(n.current?.id, "nuit");
  assert.equal(n.minutesLeft, 60);
});

test("minutesLabel", () => {
  assert.equal(minutesLabel(25), "25 min");
  assert.equal(minutesLabel(60), "1 h");
  assert.equal(minutesLabel(70), "1 h 10");
});

test("dayStrip", () => {
  assert.equal(dayStrip([], "10:00"), null);
  const s = dayStrip([blk("a", "08:00", "10:00"), blk("b", "10:00", "12:00")], "10:00")!;
  assert.equal(s.from, "08:00");
  assert.equal(s.to, "12:00");
  assert.equal(s.nowPct, 50);
  assert.deepEqual(s.segments.map((x) => [x.left, x.width, x.past]), [[0, 50, true], [50, 50, false]]);
  assert.equal(dayStrip([blk("a", "08:00", "10:00")], "07:00")!.nowPct, null);
});

const todoBase = { coached: true, now: "10:00", date: "2026-11-11", unreadMessages: 0, coachTasks: [], bilanDone: true, checkinDone: true, checkinDay: null, bilanTime: null, showVictory: false, showCycle: false };

test("buildTodos : messages, tâches, check-in, bilan", () => {
  assert.deepEqual(buildTodos(todoBase), []);
  const t = buildTodos({ ...todoBase, unreadMessages: 2, coachTasks: [1, 2, 3, 4, 5].map((i) => ({ id: String(i), label: `T${i}` })), bilanDone: false, bilanTime: "21:30" });
  assert.deepEqual(t.map((x) => x.key), ["message", "tache:1", "tache:2", "tache:3", "taches", "bilan"]);
  assert.equal(t[0].label, "2 messages de ton coach");
  assert.equal(t[4].label, "2 autres tâches du coach");
  assert.ok(t[5].sub?.startsWith("Prévu à 21:30"));
  // Non coaché : ni message ni tâche ni check-in.
  assert.deepEqual(buildTodos({ ...todoBase, coached: false, unreadMessages: 3, checkinDone: false }).map((x) => x.key), []);
});

test("buildTodos : check-in selon le jour prévu (2026-11-11 = mercredi)", () => {
  const ci = (checkinDay: number | null) => buildTodos({ ...todoBase, checkinDone: false, checkinDay }).find((x) => x.kind === "checkin");
  assert.equal(ci(5), undefined); // prévu vendredi : pas encore
  assert.equal(ci(3)?.sub, "À envoyer aujourd'hui");
  assert.equal(ci(1)?.sub, "Prévu lundi, ton coach l'attend");
  assert.equal(ci(null)?.urgent, false);
});

test("visibleTodos, mealLabelsOf, bilanTimeOf, weeksSince", () => {
  const bilan = blk("Bilan", "21:30", "21:40", { action: "bilan" });
  const todos = buildTodos({ ...todoBase, bilanDone: false });
  const day = { date: "2026-11-11", now: "21:00", blocks: [bilan], todos } as unknown as HomeDayData;
  assert.deepEqual(visibleTodos(day), []);
  assert.equal(visibleTodos({ ...day, blocks: [] }).length, 1);
  assert.equal(bilanTimeOf([bilan]), "21:30");
  assert.deepEqual(mealLabelsOf([blk("Repas 1", "08:00", "08:30", { mealSlot: "breakfast" }), blk("Autre", "09:00", "09:30", { mealSlot: "breakfast" })]), { breakfast: "Repas 1" });
  assert.equal(weeksSince(null, "2026-11-11"), 0);
  assert.equal(weeksSince("2026-10-28", "2026-11-11"), 2);
});
