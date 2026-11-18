import test from "node:test";
import assert from "node:assert/strict";
import { friendlyDbError } from "../db-error";

test("jamais le texte brut de la base à l'écran", () => {
  assert.equal(friendlyDbError({ code: "23505", message: "duplicate key value violates unique constraint" }), "C'est déjà enregistré.");
  assert.equal(friendlyDbError({ code: "23514", message: "new row violates check constraint" }), "Une valeur n'est pas acceptée. Vérifie ce que tu as saisi.");
  assert.equal(friendlyDbError({ code: "42501", message: "new row violates row-level security policy" }), "Action non autorisée sur cet élément.");
  assert.equal(friendlyDbError({ message: "TypeError: fetch failed" }), "Connexion perdue. Réessaie dans un instant.");
  assert.equal(friendlyDbError({ code: "XX000", message: "internal" }, "Ajout impossible."), "Ajout impossible.");
  assert.equal(friendlyDbError(null), "Enregistrement impossible. Réessaie dans un instant.");
});
