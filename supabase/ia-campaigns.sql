-- ============================================================
-- CAMPAGNES IA — Migration
-- ============================================================

-- 1. Campagnes warmup automatisées
CREATE TABLE IF NOT EXISTS ia_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain_id       UUID REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  goal            TEXT,                -- ex: "Prospecter des DRH de PME"
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'waiting_content', 'completed')),
  total_contacts  INTEGER NOT NULL DEFAULT 0,
  reached_count   INTEGER NOT NULL DEFAULT 0,  -- contacts ayant reçu au moins 1 email
  current_phase   INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ia_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ia_campaigns_policy" ON ia_campaigns
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Contacts associés à une campagne IA
CREATE TABLE IF NOT EXISTS ia_campaign_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID REFERENCES ia_campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id    UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'bounced', 'unsubscribed', 'skipped')),
  phase_sent    INTEGER,
  mailbox_id    UUID REFERENCES sender_identities(id),
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, contact_id)
);

ALTER TABLE ia_campaign_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ia_campaign_contacts_policy" ON ia_campaign_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM ia_campaigns WHERE ia_campaigns.id = campaign_id AND ia_campaigns.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_iacc_campaign ON ia_campaign_contacts(campaign_id, status);

-- 3. Demandes de contenu (l'IA demande un message à l'utilisateur)
CREATE TABLE IF NOT EXISTS ia_content_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID REFERENCES ia_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phase_id        INTEGER NOT NULL,         -- 1-5
  phase_name      TEXT NOT NULL,
  day_start       INTEGER NOT NULL,         -- premier jour d'utilisation
  brief           TEXT NOT NULL,            -- ce que l'IA demande à l'utilisateur
  requirements    JSONB NOT NULL DEFAULT '[]', -- liste des règles
  -- Réponse utilisateur
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'approved', 'needs_revision')),
  user_raw_input  TEXT,                     -- message brut de l'utilisateur
  ai_score        INTEGER,                  -- 0-100
  ai_checks       JSONB,                    -- [{label, passed, detail}]
  ai_issues       JSONB,                    -- ["..."]
  ai_improvements JSONB,                    -- ["..."]
  final_subject   TEXT,
  final_body      TEXT,
  due_date        DATE NOT NULL,
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ia_content_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ia_content_requests_policy" ON ia_content_requests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_iacr_campaign ON ia_content_requests(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_iacr_user     ON ia_content_requests(user_id, status, created_at DESC);
