-- SEQUENCES V2 — Migration
-- Nouvelles tables : seq, seq_step, seq_mailbox, seq_enrollment
-- Remplace : sequences, sequence_steps, sequence_enrollments, sequence_sends
-- Les anciennes tables sont conservées (données historiques) mais plus utilisées par l'appli.
-- À exécuter dans Supabase SQL Editor.

-- ─── Index manquant sur sends (Prompt 1) ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sends_seq_enrollment_id
  ON sends(seq_enrollment_id)
  WHERE seq_enrollment_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : seq
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seq (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  goal        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seq_user_id ON seq(user_id);

ALTER TABLE seq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seq_select" ON seq FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "seq_insert" ON seq FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "seq_update" ON seq FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "seq_delete" ON seq FOR DELETE USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : seq_step
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seq_step (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_id         UUID        NOT NULL REFERENCES seq(id) ON DELETE CASCADE,
  step_number    INT         NOT NULL,
  delay_days     INT         NOT NULL DEFAULT 0,
  subject        TEXT        NOT NULL DEFAULT '',
  body_html      TEXT        NOT NULL DEFAULT '',
  body_text      TEXT,
  send_condition TEXT        NOT NULL DEFAULT 'always'
                             CHECK (send_condition IN ('always', 'no_reply', 'no_open', 'no_click')),
  objective      TEXT,
  ai_tip         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (seq_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_seq_step_seq_id ON seq_step(seq_id, step_number);

ALTER TABLE seq_step ENABLE ROW LEVEL SECURITY;

-- RLS : accès scoped via seq.user_id
CREATE POLICY "seq_step_select" ON seq_step FOR SELECT
  USING (EXISTS (SELECT 1 FROM seq WHERE seq.id = seq_id AND seq.user_id = auth.uid()));
CREATE POLICY "seq_step_insert" ON seq_step FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM seq WHERE seq.id = seq_id AND seq.user_id = auth.uid()));
CREATE POLICY "seq_step_update" ON seq_step FOR UPDATE
  USING (EXISTS (SELECT 1 FROM seq WHERE seq.id = seq_id AND seq.user_id = auth.uid()));
CREATE POLICY "seq_step_delete" ON seq_step FOR DELETE
  USING (EXISTS (SELECT 1 FROM seq WHERE seq.id = seq_id AND seq.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : seq_mailbox (many-to-many séquence ↔ boîtes d'envoi)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seq_mailbox (
  seq_id     UUID        NOT NULL REFERENCES seq(id) ON DELETE CASCADE,
  mailbox_id UUID        NOT NULL REFERENCES sender_identities(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (seq_id, mailbox_id)
);

ALTER TABLE seq_mailbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seq_mailbox_select" ON seq_mailbox FOR SELECT
  USING (EXISTS (SELECT 1 FROM seq WHERE seq.id = seq_id AND seq.user_id = auth.uid()));

CREATE POLICY "seq_mailbox_insert" ON seq_mailbox FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM seq WHERE seq.id = seq_id AND seq.user_id = auth.uid())
    AND
    EXISTS (SELECT 1 FROM sender_identities WHERE id = mailbox_id AND user_id = auth.uid())
  );

CREATE POLICY "seq_mailbox_delete" ON seq_mailbox FOR DELETE
  USING (EXISTS (SELECT 1 FROM seq WHERE seq.id = seq_id AND seq.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : seq_enrollment
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seq_enrollment (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_id       UUID        NOT NULL REFERENCES seq(id) ON DELETE CASCADE,
  contact_id   UUID        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  mailbox_id   UUID        NOT NULL REFERENCES sender_identities(id),
  current_step INT         NOT NULL DEFAULT 1,
  status       TEXT        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'completed', 'stopped', 'replied', 'bounced')),
  stop_reason  TEXT        CHECK (stop_reason IN ('manual', 'converted', 'refused', 'replied', 'bounced', 'unsubscribed', 'no_condition')),
  stopped_at   TIMESTAMPTZ,
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (seq_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_seq_enrollment_seq_id     ON seq_enrollment(seq_id);
CREATE INDEX IF NOT EXISTS idx_seq_enrollment_contact_id  ON seq_enrollment(contact_id);
CREATE INDEX IF NOT EXISTS idx_seq_enrollment_active      ON seq_enrollment(status) WHERE status = 'active';

ALTER TABLE seq_enrollment ENABLE ROW LEVEL SECURITY;

-- Lecture pour les utilisateurs authentifiés (scoped via seq)
CREATE POLICY "seq_enrollment_select" ON seq_enrollment FOR SELECT
  USING (EXISTS (SELECT 1 FROM seq WHERE seq.id = seq_id AND seq.user_id = auth.uid()));

-- Écritures : service_role (drain) bypass RLS automatiquement.
-- Les RPCs cancel_* sont SECURITY DEFINER — scope auth.uid() en interne.

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC : cancel_seq_enrollment
-- Arrête un enrollment précis + passe ses sends pending en cancelling.
-- SECURITY DEFINER — identité dérivée de auth.uid() en interne, jamais en paramètre.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cancel_seq_enrollment(
  p_enrollment_id UUID,
  p_stop_reason   TEXT DEFAULT 'manual'
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid             UUID := auth.uid();
  v_cancelled_sends INT;
BEGIN
  -- Arrête l'enrollment si actif et appartient à l'utilisateur courant
  UPDATE seq_enrollment e
  SET    status = 'stopped', stop_reason = p_stop_reason, stopped_at = now()
  FROM   seq s
  WHERE  e.seq_id = s.id
    AND  s.user_id = v_uid
    AND  e.id = p_enrollment_id
    AND  e.status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object('cancelled_sends', 0, 'enrollment_stopped', false);
  END IF;

  -- Sends pending → cancelling (le drain les finalisera en cancelled, JAMAIS pending)
  WITH to_cancel AS (
    UPDATE sends
    SET    status = 'cancelling'
    WHERE  seq_enrollment_id = p_enrollment_id
      AND  status = 'pending'
    RETURNING id
  )
  SELECT count(*) INTO v_cancelled_sends FROM to_cancel;

  RETURN json_build_object('cancelled_sends', v_cancelled_sends, 'enrollment_stopped', true);
END;
$$;

REVOKE ALL ON FUNCTION cancel_seq_enrollment(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION cancel_seq_enrollment(UUID, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION cancel_seq_enrollment(UUID, TEXT) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC : cancel_contact_sequences
-- Arrête TOUS les enrollments actifs d'un contact pour l'utilisateur courant.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cancel_contact_sequences(
  p_contact_id  UUID,
  p_stop_reason TEXT DEFAULT 'manual'
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid             UUID := auth.uid();
  v_stopped_count   INT  := 0;
  v_cancelled_sends INT  := 0;
BEGIN
  WITH stopped AS (
    UPDATE seq_enrollment e
    SET    status = 'stopped', stop_reason = p_stop_reason, stopped_at = now()
    FROM   seq s
    WHERE  e.seq_id = s.id
      AND  s.user_id = v_uid
      AND  e.contact_id = p_contact_id
      AND  e.status = 'active'
    RETURNING e.id
  ),
  cancelled AS (
    UPDATE sends
    SET    status = 'cancelling'
    WHERE  seq_enrollment_id IN (SELECT id FROM stopped)
      AND  status = 'pending'
    RETURNING id
  )
  SELECT
    (SELECT count(*) FROM stopped),
    (SELECT count(*) FROM cancelled)
  INTO v_stopped_count, v_cancelled_sends;

  RETURN json_build_object('stopped_enrollments', v_stopped_count, 'cancelled_sends', v_cancelled_sends);
END;
$$;

REVOKE ALL ON FUNCTION cancel_contact_sequences(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION cancel_contact_sequences(UUID, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION cancel_contact_sequences(UUID, TEXT) TO service_role;
