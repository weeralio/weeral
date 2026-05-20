-- ============================================================
-- SÉQUENCES & RÉPONDEURS AUTO — Migration
-- ============================================================

-- 1. Séquences (templates réutilisables)
CREATE TABLE IF NOT EXISTS sequences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  goal        TEXT,
  steps_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sequences_policy" ON sequences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Étapes d'une séquence
CREATE TABLE IF NOT EXISTS sequence_steps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id    UUID REFERENCES sequences(id) ON DELETE CASCADE NOT NULL,
  step_number    INTEGER NOT NULL,
  delay_days     INTEGER NOT NULL DEFAULT 0,
  subject        TEXT NOT NULL,
  body_html      TEXT NOT NULL,
  body_text      TEXT,
  send_condition TEXT NOT NULL DEFAULT 'always'
    CHECK (send_condition IN ('always', 'no_reply', 'no_open', 'no_click')),
  objective      TEXT,
  ai_tip         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sequence_id, step_number)
);

ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sequence_steps_policy" ON sequence_steps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM sequences WHERE sequences.id = sequence_id AND sequences.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_seq_steps ON sequence_steps(sequence_id, step_number);

-- 3. Enrollements (contacts inscrits dans une séquence)
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id        UUID REFERENCES sequences(id) ON DELETE CASCADE NOT NULL,
  contact_id         UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  sender_identity_id UUID REFERENCES sender_identities(id),
  current_step       INTEGER NOT NULL DEFAULT 1,
  status             TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'unsubscribed', 'replied', 'bounced')),
  next_send_at       TIMESTAMPTZ,
  enrolled_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ,
  UNIQUE(sequence_id, contact_id)
);

ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sequence_enrollments_policy" ON sequence_enrollments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM sequences WHERE sequences.id = sequence_id AND sequences.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_seq_enroll_due ON sequence_enrollments(next_send_at, status);
CREATE INDEX IF NOT EXISTS idx_seq_enroll_seq ON sequence_enrollments(sequence_id, status);

-- 4. Log des envois de séquence
CREATE TABLE IF NOT EXISTS sequence_sends (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES sequence_enrollments(id) ON DELETE CASCADE NOT NULL,
  step_id       UUID REFERENCES sequence_steps(id) NOT NULL,
  step_number   INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'bounced', 'replied', 'skipped')),
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sequence_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sequence_sends_policy" ON sequence_sends
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sequence_enrollments se
      JOIN sequences s ON s.id = se.sequence_id
      WHERE se.id = enrollment_id AND s.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_seq_sends_enrollment ON sequence_sends(enrollment_id);

-- 5. Répondeurs automatiques
CREATE TABLE IF NOT EXISTS auto_responders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name               TEXT NOT NULL,
  trigger_event      TEXT NOT NULL DEFAULT 'reply'
    CHECK (trigger_event IN ('reply', 'open', 'click')),
  delay_minutes      INTEGER NOT NULL DEFAULT 0,
  subject            TEXT NOT NULL,
  body_html          TEXT NOT NULL,
  body_text          TEXT,
  sender_identity_id UUID REFERENCES sender_identities(id),
  is_active          BOOLEAN NOT NULL DEFAULT true,
  sent_count         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE auto_responders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auto_responders_policy" ON auto_responders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
