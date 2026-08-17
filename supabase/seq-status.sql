-- Migration : ajouter colonne status à la table seq
-- À exécuter dans Supabase SQL Editor

ALTER TABLE seq
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'stopped'));

-- Les lignes existantes héritent du DEFAULT 'active'
