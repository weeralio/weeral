-- STATUTS ET TAGS CONTACTS — Step 4
-- Couche 2 : prospect_status sur contacts
-- Couche 3 : tags TEXT[] sur contacts
-- RPCs bulk : bulk_set_prospect_status, bulk_cancel_contact_sequences
-- RPC campagne : cancel_campaign_contact
-- RPCs tags : add_contact_tag, remove_contact_tag
-- À exécuter dans Supabase SQL Editor.

-- ─── Couche 2 : statut prospect ───────────────────────────────────────────────

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS prospect_status TEXT DEFAULT 'new'
    CHECK (prospect_status IN ('new', 'contacted', 'qualified', 'refused', 'converted'));

CREATE INDEX IF NOT EXISTS idx_contacts_prospect_status
  ON contacts(prospect_status)
  WHERE prospect_status IS NOT NULL;

-- ─── Couche 3 : tags libres ───────────────────────────────────────────────────

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC : bulk_set_prospect_status
-- SECURITY DEFINER — auth.uid() en interne, jamais en paramètre
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION bulk_set_prospect_status(
  p_contact_ids UUID[],
  p_new_status  TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_updated INT;
BEGIN
  IF p_new_status NOT IN ('new','contacted','qualified','refused','converted') THEN
    RAISE EXCEPTION 'Statut invalide : %', p_new_status;
  END IF;

  UPDATE contacts
  SET    prospect_status = p_new_status
  WHERE  id = ANY(p_contact_ids)
    AND  user_id = v_uid;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN json_build_object('updated', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION bulk_set_prospect_status(UUID[], TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION bulk_set_prospect_status(UUID[], TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION bulk_set_prospect_status(UUID[], TEXT) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC : bulk_cancel_contact_sequences
-- Arrête toutes les séquences actives pour un ensemble de contacts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION bulk_cancel_contact_sequences(
  p_contact_ids UUID[],
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
      AND  e.contact_id = ANY(p_contact_ids)
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

REVOKE ALL ON FUNCTION bulk_cancel_contact_sequences(UUID[], TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION bulk_cancel_contact_sequences(UUID[], TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION bulk_cancel_contact_sequences(UUID[], TEXT) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC : cancel_campaign_contact
-- Retire un contact d'une campagne + passe ses sends en cancelling
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cancel_campaign_contact(
  p_campaign_id UUID,
  p_contact_id  UUID
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid             UUID := auth.uid();
  v_cancelling_sends INT := 0;
BEGIN
  -- Marquer le contact comme cancelled dans campaign_contacts (ownership vérifié via campaigns)
  UPDATE campaign_contacts cc
  SET    status = 'cancelled'
  FROM   campaigns c
  WHERE  cc.campaign_id = c.id
    AND  c.user_id = v_uid
    AND  cc.campaign_id = p_campaign_id
    AND  cc.contact_id  = p_contact_id
    AND  cc.status NOT IN ('sent', 'bounced', 'complained');

  -- Sends pending → cancelling
  WITH to_cancel AS (
    UPDATE sends
    SET    status = 'cancelling'
    WHERE  source_type = 'campaign'
      AND  source_id   = p_campaign_id
      AND  contact_id  = p_contact_id
      AND  status      = 'pending'
    RETURNING id
  )
  SELECT count(*) INTO v_cancelling_sends FROM to_cancel;

  RETURN json_build_object('cancelling_sends', v_cancelling_sends);
END;
$$;

REVOKE ALL ON FUNCTION cancel_campaign_contact(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION cancel_campaign_contact(UUID, UUID) TO authenticated;
GRANT  EXECUTE ON FUNCTION cancel_campaign_contact(UUID, UUID) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs : tags
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION add_contact_tag(p_contact_id UUID, p_tag TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  UPDATE contacts
  SET    tags = array_append(tags, trim(p_tag))
  WHERE  id       = p_contact_id
    AND  user_id  = v_uid
    AND  NOT (trim(p_tag) = ANY(tags));
  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION add_contact_tag(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION add_contact_tag(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION remove_contact_tag(p_contact_id UUID, p_tag TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  UPDATE contacts
  SET    tags = array_remove(tags, p_tag)
  WHERE  id      = p_contact_id
    AND  user_id = v_uid;
  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION remove_contact_tag(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION remove_contact_tag(UUID, TEXT) TO authenticated;
