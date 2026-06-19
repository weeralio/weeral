-- ─── Multi-domaines par campagne warmup ──────────────────────────────────────
-- Rend domain_id optionnel : les boîtes mail peuvent venir de plusieurs domaines.
-- Les contacts sont déjà cloisonnés à l'échelle campagne dans le cron.
-- À exécuter dans : Supabase Dashboard > SQL Editor

ALTER TABLE warmup_campaigns ALTER COLUMN domain_id DROP NOT NULL;
