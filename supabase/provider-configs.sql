-- Migration : table provider_configs (Brevo / Mailgun / SendGrid)
-- Exécute dans Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS provider_configs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider          TEXT        NOT NULL CHECK (provider IN ('brevo', 'mailgun', 'sendgrid')),
  api_key_encrypted TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

ALTER TABLE provider_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_configs_policy" ON provider_configs;
CREATE POLICY "provider_configs_policy" ON provider_configs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Si la table existait déjà avec une colonne "api_key", renomme-la
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_configs' AND column_name = 'api_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_configs' AND column_name = 'api_key_encrypted'
  ) THEN
    ALTER TABLE provider_configs RENAME COLUMN api_key TO api_key_encrypted;
  END IF;
END $$;
