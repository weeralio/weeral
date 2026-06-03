-- Migration : tracking email (opens, clics)
-- Exécute dans Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Ajouter 'opened' et 'clicked' à l'enum email_status
--    (ALTER TYPE ADD VALUE ne peut pas tourner dans une transaction)
ALTER TYPE email_status ADD VALUE IF NOT EXISTS 'opened';
ALTER TYPE email_status ADD VALUE IF NOT EXISTS 'clicked';

-- 2. Ajouter les colonnes de timestamp sur la table emails
ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS opened_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

-- 3. Index pour les requêtes analytics (count by status, par campagne)
CREATE INDEX IF NOT EXISTS idx_emails_campaign_status
  ON emails(campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_emails_status
  ON emails(status);
