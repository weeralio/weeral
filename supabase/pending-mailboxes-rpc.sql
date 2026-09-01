-- RPC: retourne les mailbox_id distincts ayant des sends en attente
-- Remplace la requête .limit(500) dans outbox-tick qui manquait les boîtes
-- ayant peu de sends dans la fenêtre retournée.
CREATE OR REPLACE FUNCTION get_mailboxes_with_pending_sends()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT mailbox_id
  FROM sends
  WHERE status = 'pending'
    AND scheduled_at <= now()
    AND mailbox_id IS NOT NULL;
$$;
