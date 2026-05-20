-- ============================================================
-- WARMUP V2 — Migration
-- Exécute dans Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Extend sender_identities with per-mailbox warmup state
ALTER TABLE sender_identities
  ADD COLUMN IF NOT EXISTS warmup_day        INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS warmup_status     TEXT NOT NULL DEFAULT 'waiting'
    CHECK (warmup_status IN ('waiting', 'resting', 'active', 'restricted', 'suspended', 'completed', 'resuming')),
  ADD COLUMN IF NOT EXISTS daily_volume      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_today        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hard_bounce_rate  NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS soft_bounce_rate  NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS open_rate         NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS complaint_rate    NUMERIC(5,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unsub_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspension_step   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended_until   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_warmup_at    TIMESTAMPTZ;

-- 2. Controlled reply boxes (user owns them — used as 50% of warmup recipients)
CREATE TABLE IF NOT EXISTS warmup_reply_boxes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email       TEXT NOT NULL,
  provider    TEXT NOT NULL DEFAULT 'gmail'
    CHECK (provider IN ('gmail', 'outlook', 'other')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, email)
);

ALTER TABLE warmup_reply_boxes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "warmup_reply_boxes_policy" ON warmup_reply_boxes;
CREATE POLICY "warmup_reply_boxes_policy" ON warmup_reply_boxes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Per-mailbox daily send events (one row per mailbox per day)
CREATE TABLE IF NOT EXISTS warmup_mailbox_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id      UUID REFERENCES sender_identities(id) ON DELETE CASCADE NOT NULL,
  domain_id       UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date            DATE NOT NULL,
  warmup_day      INTEGER NOT NULL,
  planned_volume  INTEGER NOT NULL DEFAULT 0,
  actual_volume   INTEGER NOT NULL DEFAULT 0,
  controlled_pct  NUMERIC(5,2),                    -- % envoyé vers boîtes contrôlées
  content_type    TEXT CHECK (content_type IN ('conversational', 'neutral_link', 'campaign')),
  ab_variant      TEXT CHECK (ab_variant IN ('A', 'B')),
  hard_bounces    INTEGER NOT NULL DEFAULT 0,
  soft_bounces    INTEGER NOT NULL DEFAULT 0,
  opens           INTEGER NOT NULL DEFAULT 0,
  clicks          INTEGER NOT NULL DEFAULT 0,
  complaints      INTEGER NOT NULL DEFAULT 0,
  unsubscribes    INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'restricted')),
  skip_reason     TEXT,                            -- ex: 'resting', 'suspended', 'no_reply_boxes'
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mailbox_id, date)
);

ALTER TABLE warmup_mailbox_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "warmup_mailbox_events_policy" ON warmup_mailbox_events;
CREATE POLICY "warmup_mailbox_events_policy" ON warmup_mailbox_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wme_mailbox_date ON warmup_mailbox_events(mailbox_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_wme_domain_date  ON warmup_mailbox_events(domain_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_wme_user         ON warmup_mailbox_events(user_id, date DESC);

-- 4. Alert and suspension log (one row per alert event)
CREATE TABLE IF NOT EXISTS warmup_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id       UUID REFERENCES sender_identities(id) ON DELETE CASCADE,
  domain_id        UUID REFERENCES domains(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_level      TEXT NOT NULL
    CHECK (alert_level IN ('info', 'alert', 'restricted', 'suspended', 'domain_suspended', 'resumed')),
  metric           TEXT NOT NULL,
  metric_value     NUMERIC(8,3) NOT NULL,
  threshold        NUMERIC(8,3) NOT NULL,
  message          TEXT NOT NULL,
  recommendation   TEXT,
  dismissed        BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE warmup_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "warmup_alerts_policy" ON warmup_alerts;
CREATE POLICY "warmup_alerts_policy" ON warmup_alerts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wa_user    ON warmup_alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_mailbox ON warmup_alerts(mailbox_id, created_at DESC);

-- 5. Helper: compute hard bounce rate for a mailbox over last N events
CREATE OR REPLACE FUNCTION get_mailbox_hard_bounce_rate(p_mailbox_id UUID, p_days INTEGER DEFAULT 7)
RETURNS NUMERIC AS $$
  SELECT
    CASE WHEN SUM(actual_volume) = 0 THEN 0
         ELSE ROUND((SUM(hard_bounces)::NUMERIC / SUM(actual_volume)) * 100, 2)
    END
  FROM warmup_mailbox_events
  WHERE mailbox_id = p_mailbox_id
    AND date >= CURRENT_DATE - p_days
    AND status = 'completed';
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_mailbox_complaint_rate(p_mailbox_id UUID, p_days INTEGER DEFAULT 7)
RETURNS NUMERIC AS $$
  SELECT
    CASE WHEN SUM(actual_volume) = 0 THEN 0
         ELSE ROUND((SUM(complaints)::NUMERIC / SUM(actual_volume)) * 100, 3)
    END
  FROM warmup_mailbox_events
  WHERE mailbox_id = p_mailbox_id
    AND date >= CURRENT_DATE - p_days
    AND status = 'completed';
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;
