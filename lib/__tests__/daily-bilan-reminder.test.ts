import { test } from "node:test";
import assert from "node:assert/strict";
import { whoNeedsBilanReminder, bilanReminderUrl } from "../daily-bilan-reminder";

test("relance seulement ceux qui ont un bilan récent mais pas aujourd'hui", () => {
  const rows = [
    { client_id: "a", log_date: "2026-11-12" },
    { client_id: "a", log_date: "2026-11-13" },
    { client_id: "b", log_date: "2026-11-10" },
    { client_id: "b", log_date: "2026-11-11" },
  ];
  assert.deepEqual(whoNeedsBilanReminder(rows, "2026-11-13"), ["b"]);
});

test("lien selon le rôle", () => {
  assert.equal(bilanReminderUrl("coach"), "/dashboard/coach/moi/bilan");
  assert.equal(bilanReminderUrl("client"), "/dashboard/client/bilan");
});
