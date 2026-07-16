-- Ajout du tracking open/click sur les envois de séquence
ALTER TABLE sequence_sends
  ADD COLUMN IF NOT EXISTS opened_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_seq_sends_opened  ON sequence_sends(enrollment_id) WHERE opened_at  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seq_sends_clicked ON sequence_sends(enrollment_id) WHERE clicked_at IS NOT NULL;
