-- ============================================================
-- LISTES DE CONTACTS — Migration
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#8b5cf6',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_lists_policy" ON contact_lists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS contact_list_members (
  list_id     UUID REFERENCES contact_lists(id) ON DELETE CASCADE NOT NULL,
  contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (list_id, contact_id)
);

ALTER TABLE contact_list_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_list_members_policy" ON contact_list_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM contact_lists WHERE contact_lists.id = list_id AND contact_lists.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_clm_list    ON contact_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_clm_contact ON contact_list_members(contact_id);
