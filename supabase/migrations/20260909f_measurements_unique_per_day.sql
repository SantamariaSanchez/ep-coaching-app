-- Une seule prise de mensurations par client et par jour, comme step_logs/
-- biometric_logs/daily_logs (un vrai upsert, pas un insert brut) : sans
-- contrainte, un double-tap sur "Enregistrer" (ou re-sauvegarder le même
-- jour après modification) créait une ligne en plus au lieu de remplacer
-- l'existante, faussant l'historique/BeforeAfterComparator. Vérifié en base
-- avant migration : 0 doublon existant sur (client_id, measured_at).
alter table measurements
  add constraint measurements_client_id_measured_at_key unique (client_id, measured_at);
