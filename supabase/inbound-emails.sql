-- ============================================================
-- BOITE DE RÉCEPTION — Emails entrants (réponses aux séquences)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS inbound_emails (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id        UUID REFERENCES sequence_enrollments(id) ON DELETE SET NULL,
  sender_identity_id   UUID REFERENCES sender_identities(id) ON DELETE SET NULL,
  from_email           TEXT NOT NULL,
  from_name            TEXT,
  subject              TEXT,
  body_plain           TEXT,
  body_html            TEXT,
  received_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbound_emails_policy" ON inbound_emails
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_user_date ON inbound_emails(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_enrollment  ON inbound_emails(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_identity    ON inbound_emails(sender_identity_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_unread      ON inbound_emails(user_id, read_at) WHERE read_at IS NULL;
