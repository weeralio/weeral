-- =============================================================
-- SENDS — Table unifiée d'envoi + infrastructure moteur
-- Prompt 1 : sends, claim atomique, daily-reset, recovery
-- Prompt 3 : colonnes throttle sur sender_identities
-- Prompt 5 : mailgun_region sur domains
-- Prompt 6 : renommage emails.ses_message_id → provider_msg_id
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. Table sends
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sends (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id)          ON DELETE CASCADE,
  mailbox_id        UUID        NOT NULL REFERENCES sender_identities(id),
  contact_id        UUID        NOT NULL REFERENCES contacts(id),

  -- Source de l'envoi
  source_type       TEXT        NOT NULL CHECK (source_type IN ('campaign', 'sequence', 'ia_campaign')),
  source_id         UUID        NOT NULL,   -- campaign_id / seq_id / ia_campaign_id
  step_number       INT         NOT NULL DEFAULT 1,
  seq_enrollment_id UUID,                   -- renseigné pour source_type='sequence' (Prompt 2)

  -- Contenu dénormalisé (template non interpolé — interpolation faite au drain)
  subject           TEXT        NOT NULL,
  body_html         TEXT        NOT NULL,
  body_text         TEXT,
  reply_to          TEXT,

  -- Planification
  scheduled_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Statut
  status            TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'cancelling', 'sent', 'failed', 'cancelled')),

  -- Exécution
  claimed_at        TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  attempt_count     INT         NOT NULL DEFAULT 0,
  last_error        TEXT,

  -- Tracking (Step 6)
  provider_msg_id   TEXT,        -- ID Mailgun/SES — lookup webhooks
  opened_at         TIMESTAMPTZ,
  clicked_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotence campagnes : un seul send par (campaign, contact)
CREATE UNIQUE INDEX IF NOT EXISTS uq_sends_campaign
  ON sends (source_id, contact_id, step_number)
  WHERE source_type = 'campaign';

-- Idempotence séquences : un seul send par (enrollment, étape) — Prompt 2
CREATE UNIQUE INDEX IF NOT EXISTS uq_sends_sequence
  ON sends (seq_enrollment_id, step_number)
  WHERE source_type = 'sequence' AND seq_enrollment_id IS NOT NULL;

-- Indexes de performance
CREATE INDEX IF NOT EXISTS idx_sends_mailbox_pending
  ON sends (mailbox_id, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sends_provider_msg_id
  ON sends (provider_msg_id)
  WHERE provider_msg_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sends_seq_enrollment
  ON sends (seq_enrollment_id)
  WHERE seq_enrollment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sends_contact
  ON sends (contact_id);

CREATE INDEX IF NOT EXISTS idx_sends_user_status
  ON sends (user_id, status, created_at DESC);

-- RLS : lecture user-scoped ; les writes viennent du service_role (workers)
ALTER TABLE sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own sends" ON sends
  FOR SELECT USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- 2. RPC : claim atomique d'un send pour une boîte
--    Appelée exclusivement par le worker (service_role).
--    SKIP LOCKED → deux workers concurrents ne clament jamais le même send.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION claim_send_for_mailbox(p_mailbox_id UUID)
RETURNS SETOF sends
LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  WITH claimed AS (
    SELECT id FROM sends
    WHERE  mailbox_id   = p_mailbox_id
      AND  status       = 'pending'
      AND  scheduled_at <= now()
    ORDER  BY scheduled_at
    LIMIT  1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE sends s
  SET    status        = 'sending',
         claimed_at   = now(),
         attempt_count = attempt_count + 1
  FROM   claimed
  WHERE  s.id = claimed.id
  RETURNING s.*;
$$;

REVOKE ALL ON FUNCTION claim_send_for_mailbox FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION claim_send_for_mailbox TO service_role;

-- ──────────────────────────────────────────────────────────────
-- 3. RPC : enqueue des contacts d'une campagne (ON CONFLICT DO NOTHING)
--    Appelée par outbox-tick pour chaque campagne 'running'.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION enqueue_campaign_sends(p_campaign_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO sends (
    user_id, mailbox_id, contact_id,
    source_type, source_id, step_number,
    subject, body_html, body_text,
    scheduled_at
  )
  SELECT
    c.user_id,
    c.sender_identity_id,
    cc.contact_id,
    'campaign',
    c.id,
    1,
    c.subject,
    c.body_html,
    c.body_text,
    now()
  FROM campaigns c
  JOIN campaign_contacts cc ON cc.campaign_id = c.id
  JOIN contacts          ct ON ct.id          = cc.contact_id
  WHERE c.id          = p_campaign_id
    AND c.status      = 'running'
    AND cc.status     = 'pending'
    AND ct.unsubscribed = FALSE
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION enqueue_campaign_sends FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION enqueue_campaign_sends TO service_role;

-- ──────────────────────────────────────────────────────────────
-- 4. RPC : recovery — remet en pending les sends bloqués en 'sending'
--    INVARIANT CRITIQUE : 'cancelling' → 'cancelled', jamais → 'pending'
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION recover_stuck_sends()
RETURNS TABLE(resurrected INT, finalized INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_resurrected INT;
  v_finalized   INT;
BEGIN
  -- Sends coincés en 'sending' (worker mort) → retour à pending pour retry
  UPDATE sends
  SET    status     = 'pending',
         claimed_at = NULL
  WHERE  status     = 'sending'
    AND  claimed_at < now() - INTERVAL '10 minutes';
  GET DIAGNOSTICS v_resurrected = ROW_COUNT;

  -- Sends coincés en 'cancelling' → cancelled définitif (JAMAIS ressusciter en pending)
  UPDATE sends
  SET    status = 'cancelled'
  WHERE  status = 'cancelling'
    AND  claimed_at < now() - INTERVAL '10 minutes';
  GET DIAGNOSTICS v_finalized = ROW_COUNT;

  RETURN QUERY SELECT v_resurrected, v_finalized;
END;
$$;

REVOKE ALL ON FUNCTION recover_stuck_sends FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION recover_stuck_sends TO service_role;

-- ──────────────────────────────────────────────────────────────
-- 5. RPC : reset quotidien des compteurs throttle (Prompt 3)
--    Appelée par daily-reset Trigger.dev task, jamais par le warmup.
--    sender_identities.sent_today / daily_volume restent propriété du warmup.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION daily_reset_throttle_counters()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE sender_identities
  SET    throttle_sent_today = 0,
         throttle_sent_date  = CURRENT_DATE
  WHERE  throttle_sent_date IS NULL
    OR   throttle_sent_date < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION daily_reset_throttle_counters FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION daily_reset_throttle_counters TO service_role;

-- ──────────────────────────────────────────────────────────────
-- 6. Colonnes throttle sur sender_identities (Prompt 3)
--    Préfixe throttle_ pour ne pas entrer en conflit avec
--    sent_today / daily_volume qui appartiennent au warmup cron.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE sender_identities
  ADD COLUMN IF NOT EXISTS throttle_daily_limit  INT         NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS throttle_sent_today   INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS throttle_sent_date    DATE,
  ADD COLUMN IF NOT EXISTS next_available_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS min_interval_seconds  INT         NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS jitter_seconds        INT         NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS send_window_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS send_window_start     TIME        NOT NULL DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS send_window_end       TIME        NOT NULL DEFAULT '18:00:00',
  ADD COLUMN IF NOT EXISTS send_timezone         TEXT        NOT NULL DEFAULT 'Europe/Paris',
  ADD COLUMN IF NOT EXISTS skip_weekend          BOOLEAN     NOT NULL DEFAULT TRUE;

-- ──────────────────────────────────────────────────────────────
-- 7. Mailgun region par domaine (Prompt 5)
--    Fixe la région au niveau du domaine pour éviter le fallback
--    sur erreur 401/404 qui masque les vrais problèmes d'auth.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE domains
  ADD COLUMN IF NOT EXISTS mailgun_region TEXT NOT NULL DEFAULT 'us'
    CHECK (mailgun_region IN ('us', 'eu'));

-- ──────────────────────────────────────────────────────────────
-- 8. emails table — renommage + colonnes tracking (Prompt 6)
-- ──────────────────────────────────────────────────────────────

-- Renommer ses_message_id → provider_msg_id
-- (le nom stocke en réalité l'ID Mailgun, pas SES)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'emails'
       AND column_name  = 'ses_message_id'
  ) THEN
    ALTER TABLE emails RENAME COLUMN ses_message_id TO provider_msg_id;
  END IF;
END $$;

-- Colonnes tracking ouverture / clic (existaient dans le code mais pas le schéma)
ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS opened_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

-- Valeurs 'opened' et 'clicked' dans l'enum email_status
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'email_status'::regtype AND enumlabel = 'opened'
  ) THEN ALTER TYPE email_status ADD VALUE 'opened'; END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'email_status'::regtype AND enumlabel = 'clicked'
  ) THEN ALTER TYPE email_status ADD VALUE 'clicked'; END IF;
END $$;

-- Index sur provider_msg_id (l'ancien index unnamed sur ses_message_id
-- est automatiquement mis à jour par PostgreSQL lors du RENAME COLUMN)
CREATE INDEX IF NOT EXISTS idx_emails_provider_msg_id
  ON emails (provider_msg_id)
  WHERE provider_msg_id IS NOT NULL;
