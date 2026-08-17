-- ─── Warmup Campaigns ────────────────────────────────────────────────────────
-- User-configured warmup campaigns: which mailboxes, which lists, what goal.
-- The cron reads this to send actual warmup emails each day.

CREATE TABLE IF NOT EXISTS warmup_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id     UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  cta_objective TEXT,                   -- plain-text goal for AI generation
  cta_url       TEXT,                   -- CTA link (used from J9 onward)
  list_ids      UUID[] NOT NULL DEFAULT '{}',
  mailbox_ids   UUID[] NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE warmup_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "warmup_campaigns_policy" ON warmup_campaigns;
CREATE POLICY "warmup_campaigns_policy" ON warmup_campaigns
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wcamp_user   ON warmup_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_wcamp_domain ON warmup_campaigns(domain_id);

-- ─── Warmup Messages ─────────────────────────────────────────────────────────
-- Email content per phase and variant. Variants allow different mailboxes to
-- send slightly different copies of the same message.

CREATE TABLE IF NOT EXISTS warmup_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warmup_campaign_id  UUID NOT NULL REFERENCES warmup_campaigns(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase               TEXT NOT NULL CHECK (phase IN ('j4_j8', 'j9', 'j10_j14')),
  variant_index       INT  NOT NULL DEFAULT 0,   -- 0 = base, 1,2... = variants for other mailboxes
  subject             TEXT NOT NULL,
  body_html           TEXT NOT NULL,
  has_link            BOOL NOT NULL DEFAULT false,
  ai_generated        BOOL NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warmup_campaign_id, phase, variant_index)
);

ALTER TABLE warmup_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "warmup_messages_policy" ON warmup_messages;
CREATE POLICY "warmup_messages_policy" ON warmup_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wmsg_campaign ON warmup_messages(warmup_campaign_id, phase);

-- ─── Warmup Sends ────────────────────────────────────────────────────────────
-- Tracks which contacts received warmup emails. Prevents re-sending to the
-- same contact from the same mailbox within the same campaign.

CREATE TABLE IF NOT EXISTS warmup_sends (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warmup_campaign_id  UUID NOT NULL REFERENCES warmup_campaigns(id) ON DELETE CASCADE,
  mailbox_id          UUID NOT NULL REFERENCES sender_identities(id) ON DELETE CASCADE,
  contact_id          UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warmup_day          INT NOT NULL,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warmup_campaign_id, mailbox_id, contact_id)
);

ALTER TABLE warmup_sends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "warmup_sends_policy" ON warmup_sends;
CREATE POLICY "warmup_sends_policy" ON warmup_sends
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wsend_campaign_mailbox ON warmup_sends(warmup_campaign_id, mailbox_id);
