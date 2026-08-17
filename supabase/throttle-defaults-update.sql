-- THROTTLE DEFAULTS UPDATE
-- Nouveau défaut : 25 mails/jour (étais 50), jitter 180s (étais 60s)
-- Met aussi à jour les boîtes existantes encore sur les anciens défauts (50 + 60 ensemble).
-- Si l'une des deux valeurs a déjà été personnalisée, la ligne n'est PAS touchée.

ALTER TABLE sender_identities
  ALTER COLUMN throttle_daily_limit SET DEFAULT 25,
  ALTER COLUMN jitter_seconds       SET DEFAULT 180;

-- Mise à jour des boîtes jamais personnalisées (anciennes valeurs exactes ensemble)
UPDATE sender_identities
SET   throttle_daily_limit = 25,
      jitter_seconds       = 180
WHERE throttle_daily_limit = 50
  AND jitter_seconds       = 60;
