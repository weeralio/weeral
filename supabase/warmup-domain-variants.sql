-- 3 variantes par domaine d'envoi dans les campagnes warmup
-- domain_ids stocke la liste ordonnée des domaines de la campagne
ALTER TABLE warmup_campaigns ADD COLUMN IF NOT EXISTS domain_ids UUID[] NOT NULL DEFAULT '{}';
