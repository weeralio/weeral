-- Exécute ce fichier dans l'éditeur SQL Supabase
-- Migration : ajout des fonctionnalités IA (séquences + notifications)

-- 1. Colonnes IA sur la table campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS sequence_data      JSONB,
  ADD COLUMN IF NOT EXISTS target_description TEXT,
  ADD COLUMN IF NOT EXISTS ai_strategy        TEXT;

-- 2. Table notifications IA
CREATE TABLE IF NOT EXISTS ai_notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type         TEXT        NOT NULL DEFAULT 'tip'
               CHECK (type IN ('tip', 'alert', 'warning', 'success')),
  title        TEXT        NOT NULL,
  message      TEXT        NOT NULL,
  action_label TEXT,
  action_href  TEXT,
  dismissed    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_notifications_policy" ON ai_notifications;
CREATE POLICY "ai_notifications_policy" ON ai_notifications
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_notif_user
  ON ai_notifications(user_id, dismissed, created_at DESC);

-- 3. Table chat IA (historique)
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_chat_policy" ON ai_chat_messages;
CREATE POLICY "ai_chat_policy" ON ai_chat_messages
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user
  ON ai_chat_messages(user_id, created_at DESC);
